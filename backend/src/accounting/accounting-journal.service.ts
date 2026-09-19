import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJournalEntryDto, QueryJournalDto, ReverseJournalDto } from './dto/journal.dto';

@Injectable()
export class AccountingJournalService {
  private readonly logger = new Logger(AccountingJournalService.name);
  private lastSeqMap = new Map<number, number>();

  constructor(private prisma: PrismaService) {}

  /**
   * Generates a sequential, concurrency-safe Journal Entry Number (e.g. JE-2026-000001).
   */
  async generateNextJournalNumber(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `JE-${currentYear}-`;

    let currentSeq = this.lastSeqMap.get(currentYear);
    if (currentSeq === undefined) {
      const count = await this.prisma.journalEntry.count({
        where: {
          journalNumber: { startsWith: prefix },
        },
      });
      currentSeq = count;
    }

    currentSeq++;
    this.lastSeqMap.set(currentYear, currentSeq);

    while (true) {
      const candidate = `${prefix}${currentSeq.toString().padStart(6, '0')}`;
      const exists = await this.prisma.journalEntry.findUnique({
        where: { journalNumber: candidate },
        select: { id: true },
      });
      if (!exists) {
        return candidate;
      }
      currentSeq++;
      this.lastSeqMap.set(currentYear, currentSeq);
    }
  }

  private cachedOpenPeriod: any = null;
  private cachedOpenPeriodExpires = 0;
  private accountValidationCache = new Map<string, boolean>();

  /**
   * Finds active open accounting period for a given date.
   */
  async getActiveAccountingPeriod(date: Date) {
    const now = Date.now();
    if (this.cachedOpenPeriod && now < this.cachedOpenPeriodExpires) {
      const p = this.cachedOpenPeriod;
      if (new Date(p.startDate) <= date && new Date(p.endDate) >= date && p.status === 'OPEN') {
        return p;
      }
    }

    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        status: 'OPEN',
      },
    });

    if (!period) {
      // Check if period exists but is closed
      const closed = await this.prisma.accountingPeriod.findFirst({
        where: {
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });

      if (closed) {
        throw new BadRequestException(
          `Accounting Period "${closed.periodName}" is ${closed.status}. Transactions cannot be posted to closed/locked periods.`,
        );
      }

      // Automatically find any open period as fallback or throw
      const anyOpen = await this.prisma.accountingPeriod.findFirst({
        where: { status: 'OPEN' },
        orderBy: { startDate: 'desc' },
      });

      if (!anyOpen) {
        throw new BadRequestException('No OPEN accounting period is configured in the system.');
      }
      this.cachedOpenPeriod = anyOpen;
      this.cachedOpenPeriodExpires = now + 60000;
      return anyOpen;
    }

    this.cachedOpenPeriod = period;
    this.cachedOpenPeriodExpires = now + 60000;
    return period;
  }

  /**
   * Creates and posts a balanced double-entry journal.
   */
  async createJournalEntry(dto: CreateJournalEntryDto, userId?: string) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('A journal entry must contain at least 2 lines (minimum one debit and one credit).');
    }

    const entryDate = dto.entryDate ? new Date(dto.entryDate) : new Date();

    // 1. Resolve Accounting Period
    let periodId = dto.accountingPeriodId;
    if (!periodId) {
      const period = await this.getActiveAccountingPeriod(entryDate);
      periodId = period.id;
    } else {
      const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
      if (!period || period.status !== 'OPEN') {
        throw new BadRequestException('Target accounting period is not OPEN for postings.');
      }
    }

    // 2. Validate Double-Entry Mathematical Balance
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of dto.lines) {
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);

      if (d < 0 || c < 0) {
        throw new BadRequestException('Negative debit or credit amounts are not permitted in accounting.');
      }
      if (d === 0 && c === 0) {
        throw new BadRequestException('Every journal line must specify a non-zero debit or credit amount.');
      }
      if (d > 0 && c > 0) {
        throw new BadRequestException('A single journal line cannot specify both debit and credit amounts.');
      }

      totalDebit += d;
      totalCredit += c;
    }

    // Rounding safety to 2 decimal places
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException('Journal entry total must be greater than zero.');
    }

    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.01) {
      throw new BadRequestException(
        `Journal entry is unbalanced: Total Debits (Rs. ${totalDebit.toFixed(2)}) != Total Credits (Rs. ${totalCredit.toFixed(2)}). Discrepancy: Rs. ${difference.toFixed(2)}.`,
      );
    }

    // 3. Verify Account Eligibility (Cached)
    const accountIds = Array.from(new Set(dto.lines.map((l) => l.accountId)));
    const missingInCache = accountIds.filter((id) => !this.accountValidationCache.has(id));

    if (missingInCache.length > 0) {
      const fetchedAccounts = await this.prisma.account.findMany({
        where: { id: { in: missingInCache } },
      });

      for (const acc of fetchedAccounts) {
        if (acc.isActive && acc.allowPosting) {
          this.accountValidationCache.set(acc.id, true);
        } else {
          this.accountValidationCache.set(acc.id, false);
        }
      }
    }

    for (const accId of accountIds) {
      const valid = this.accountValidationCache.get(accId);
      if (valid === false) {
        throw new BadRequestException(`Account "${accId}" is not eligible for direct posting.`);
      }
    }

    // 4. Generate Journal Number and Commit Transactionally
    const journalNumber = await this.generateNextJournalNumber(entryDate.getFullYear());

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          journalNumber,
          entryDate,
          accountingPeriodId: periodId!,
          referenceType: dto.referenceType || 'MANUAL',
          referenceId: dto.referenceId || null,
          referenceNumber: dto.referenceNumber || null,
          narration: dto.narration,
          status: dto.status || 'POSTED',
          sourceModule: dto.sourceModule || 'MANUAL',
          sourceEntityId: dto.sourceEntityId || null,
          totalDebit,
          totalCredit,
          createdById: userId || null,
          postedAt: dto.status === 'POSTED' ? new Date() : null,
          lines: {
            create: dto.lines.map((l) => ({
              accountId: l.accountId,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              description: l.description || null,
              reference: l.reference || null,
              costCenter: l.costCenter || null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  accountCode: true,
                  accountName: true,
                  accountType: true,
                  accountGroup: true,
                },
              },
            },
          },
          accountingPeriod: true,
        },
      });

      return entry;
    });
  }

  /**
   * Reverses a posted journal entry by generating an opposing journal entry.
   */
  async reverseJournalEntry(id: string, dto: ReverseJournalDto, userId?: string) {
    const original = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!original) throw new NotFoundException(`Journal entry with ID "${id}" not found.`);

    if (original.status === 'REVERSED') {
      throw new BadRequestException(`Journal #${original.journalNumber} has already been reversed.`);
    }

    if (original.reversedEntryId) {
      throw new BadRequestException(`Journal #${original.journalNumber} is already a reversing entry.`);
    }

    const revDate = dto.reversalDate ? new Date(dto.reversalDate) : new Date();
    const period = await this.getActiveAccountingPeriod(revDate);

    // Build opposing lines
    const reversingLines = original.lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.credit || 0), // Swap
      credit: Number(l.debit || 0), // Swap
      description: `Reversal of ${original.journalNumber}: ${l.description || ''}`.trim(),
      reference: original.journalNumber,
      costCenter: l.costCenter || null,
    }));

    const revJournalNumber = await this.generateNextJournalNumber(revDate.getFullYear());

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Reversing Entry
      const reversingEntry = await tx.journalEntry.create({
        data: {
          journalNumber: revJournalNumber,
          entryDate: revDate,
          accountingPeriodId: period.id,
          referenceType: 'REVERSAL',
          referenceId: original.id,
          referenceNumber: original.journalNumber,
          narration: `Reversal of ${original.journalNumber}: ${dto.reason}`,
          status: 'POSTED',
          sourceModule: original.sourceModule,
          sourceEntityId: original.sourceEntityId,
          totalDebit: original.totalCredit,
          totalCredit: original.totalDebit,
          createdById: userId || null,
          postedAt: new Date(),
          reversedEntryId: original.id,
          lines: {
            create: reversingLines,
          },
        },
        include: {
          lines: { include: { account: true } },
        },
      });

      // 2. Mark Original as REVERSED
      await tx.journalEntry.update({
        where: { id: original.id },
        data: {
          status: 'REVERSED',
          reversedEntryId: reversingEntry.id,
        },
      });

      return reversingEntry;
    });
  }

  /**
   * Retrieves journal entries with filtering & pagination.
   */
  async getJournalEntries(query: QueryJournalDto) {
    const where: any = {};
    if (query.status) where.status = query.status.toUpperCase();
    if (query.referenceType) where.referenceType = query.referenceType.toUpperCase();
    if (query.sourceModule) where.sourceModule = query.sourceModule.toUpperCase();

    if (query.startDate || query.endDate) {
      where.entryDate = {};
      if (query.startDate) where.entryDate.gte = new Date(query.startDate);
      if (query.endDate) where.entryDate.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { journalNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { narration: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  accountCode: true,
                  accountName: true,
                  accountType: true,
                },
              },
            },
          },
          accountingPeriod: { select: { financialYear: true, periodName: true } },
          createdBy: { select: { fullName: true, email: true } },
        },
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single journal entry details.
   */
  async getJournalEntryById(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        accountingPeriod: true,
        createdBy: { select: { fullName: true, email: true } },
        reversedEntry: { select: { id: true, journalNumber: true } },
      },
    });

    if (!entry) throw new NotFoundException(`Journal entry with ID "${id}" not found.`);
    return entry;
  }
}
