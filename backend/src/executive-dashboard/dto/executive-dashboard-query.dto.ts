import { IsOptional, IsString, IsIn } from 'class-validator';

export class ExecutiveDashboardQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'today',
    'this_week',
    'this_month',
    'last_month',
    'this_quarter',
    'current_fy',
    'previous_fy',
    'custom',
    'all',
  ])
  period?: string = 'current_fy';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
  previousStartDate?: Date;
  previousEndDate?: Date;
}

/**
 * Parses and returns deterministic date ranges including Indian Financial Year logic (1 April - 31 March).
 */
export function parseDateRange(dto: ExecutiveDashboardQueryDto): DateRange {
  const now = new Date();
  const period = dto.period || 'current_fy';

  let start = new Date(now);
  let end = new Date(now);
  let label = 'Current Financial Year';
  let prevStart: Date | undefined;
  let prevEnd: Date | undefined;

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = 'Today';
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
      break;
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
      label = 'This Week';
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 7);
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = start.toLocaleString('default', { month: 'long', year: 'numeric' });
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'this_quarter': {
      const currentMonth = now.getMonth(); // 0-11
      // In Indian FY: Q1: Apr-Jun (3-5), Q2: Jul-Sep (6-8), Q3: Oct-Dec (9-11), Q4: Jan-Mar (0-2)
      let qStartMonth = 3;
      let qEndMonth = 5;
      let qYear = now.getFullYear();

      if (currentMonth >= 3 && currentMonth <= 5) {
        qStartMonth = 3;
        qEndMonth = 5;
        label = `Q1 (Apr - Jun ${qYear})`;
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        qStartMonth = 6;
        qEndMonth = 8;
        label = `Q2 (Jul - Sep ${qYear})`;
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        qStartMonth = 9;
        qEndMonth = 11;
        label = `Q3 (Oct - Dec ${qYear})`;
      } else {
        qStartMonth = 0;
        qEndMonth = 2;
        label = `Q4 (Jan - Mar ${qYear})`;
      }

      start = new Date(qYear, qStartMonth, 1, 0, 0, 0, 0);
      end = new Date(qYear, qEndMonth + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 3);
      prevEnd = new Date(end);
      prevEnd.setMonth(prevEnd.getMonth() - 3);
      break;
    }
    case 'previous_fy': {
      const currentMonth = now.getMonth();
      const currentFYStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const prevFYStartYear = currentFYStartYear - 1;

      start = new Date(prevFYStartYear, 3, 1, 0, 0, 0, 0); // 1 April
      end = new Date(prevFYStartYear + 1, 2, 31, 23, 59, 59, 999); // 31 March
      label = `FY ${prevFYStartYear}-${(prevFYStartYear + 1).toString().slice(-2)}`;
      break;
    }
    case 'custom': {
      if (dto.startDate) {
        start = new Date(dto.startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      }
      if (dto.endDate) {
        end = new Date(dto.endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
      label = `${start.toLocaleDateString('en-GB')} to ${end.toLocaleDateString('en-GB')}`;
      break;
    }
    case 'all': {
      start = new Date(2020, 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear() + 2, 11, 31, 23, 59, 59, 999);
      label = 'All Time';
      break;
    }
    case 'current_fy':
    default: {
      // Indian Financial Year: 1 April to 31 March
      const currentMonth = now.getMonth(); // 0 is Jan, 3 is April
      const fyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyEndYear = fyStartYear + 1;

      start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0); // 1 April
      end = new Date(fyEndYear, 2, 31, 23, 59, 59, 999); // 31 March
      label = `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`;

      prevStart = new Date(fyStartYear - 1, 3, 1, 0, 0, 0, 0);
      prevEnd = new Date(fyStartYear, 2, 31, 23, 59, 59, 999);
      break;
    }
  }

  return {
    startDate: start,
    endDate: end,
    label,
    previousStartDate: prevStart,
    previousEndDate: prevEnd,
  };
}
