# Leave Structure Update - September 2025

## Overview

The leave management system has been updated to implement a new monthly accrual-based leave policy that aligns with the company's revised leave structure.

## New Leave Policy

### Leave Types and Limits

1. **Earned/Annual Leave (EL/AL/PL)**

   - **Annual Limit**: 15 days per year
   - **Monthly Accrual**: 1.25 days per month
   - **Description**: Annual leave for personal reasons, earned monthly

2. **Sick Leave (SL)**

   - **Annual Limit**: 6 days per year
   - **Monthly Accrual**: 0.5 days per month
   - **Description**: Medical leave for health reasons, earned monthly

3. **Casual Leave (CL)**

   - **Annual Limit**: 6 days per year
   - **Monthly Accrual**: 0.5 days per month
   - **Description**: Short-term leave for urgent matters, earned monthly

4. **Other Leave Types**
   - **Maternity Leave**: 180 days (unchanged)
   - **Paternity Leave**: 15 days (unchanged)
   - **Comp Off**: Unlimited (based on overtime work)

### Key Policy Changes

- **Leave Year**: April 1st to March 31st (fiscal year)
- **New Employee Eligibility**: Can take first leave after completing one month of service
- **Monthly Earning System**: Leave days are earned progressively each month
- **Removed Leave Types**: "Paid Leave" and "Unpaid Leave" have been removed

## Technical Implementation

### Database Changes

1. **Updated `system_settings`**

   - `total_annual_leaves` changed from 27 to 15

2. **Updated `leave_types` table**

   - "Privilege Leave" renamed to "Earned/Annual Leave"
   - Updated descriptions and max_days limits
   - Removed unused leave types

3. **New `monthly_leave_accruals` table**

   - Tracks monthly leave accruals for each employee
   - Records earned leave, sick leave, and casual leave per month
   - Maintains running totals

4. **New `leave_type_balances` table**
   - Separate balance tracking for each leave type
   - More granular leave management
   - Better reporting capabilities

### Code Updates

- **Backend Routes**: Updated to use new leave structure
- **Frontend Components**: Updated to reflect new leave limits
- **Database Scripts**: Updated default values and configurations

## Migration Details

### What Was Updated

- ✅ System settings: 27 → 15 annual leaves
- ✅ Leave types: Updated names, descriptions, and limits
- ✅ Database structure: Added new tables for monthly accruals
- ✅ Existing employees: Leave balances recalculated based on service months
- ✅ Frontend components: Updated to show new leave structure

### What Remains Unchanged

- ✅ Leave request workflow (Manager → HR approval)
- ✅ Half-day leave functionality
- ✅ Comp Off system
- ✅ Maternity/Paternity leave policies

## Usage Examples

### Monthly Accrual Calculation

- **April**: 1.25 EL + 0.5 SL + 0.5 CL = 2.25 total days
- **May**: 2.50 EL + 1.0 SL + 1.0 CL = 4.50 total days
- **June**: 3.75 EL + 1.5 SL + 1.5 CL = 6.75 total days
- **Maximum**: 15.0 EL + 6.0 SL + 6.0 CL = 27.0 total days

### Employee Scenarios

1. **New Employee (Joins in June)**

   - June: 1.25 EL + 0.5 SL + 0.5 CL = 2.25 days
   - July: 2.50 EL + 1.0 SL + 1.0 CL = 4.50 days
   - Can take first leave after July (1 month service)

2. **Existing Employee (Full Year)**
   - April-March: 15.0 EL + 6.0 SL + 6.0 CL = 27.0 days
   - Full leave entitlement available

## Benefits of New System

1. **Fairness**: Leave earned based on actual service time
2. **Transparency**: Clear monthly accrual tracking
3. **Flexibility**: Progressive leave earning throughout the year
4. **Compliance**: Aligns with company's revised leave policy
5. **Reporting**: Better analytics and leave balance tracking

## Maintenance

### Monthly Updates

The system automatically calculates monthly accruals. No manual intervention required.

### Annual Reset

Leave balances reset on April 1st each year, with new monthly accruals starting.

### Monitoring

- Check `monthly_leave_accruals` table for monthly progress
- Monitor `leave_type_balances` for current employee entitlements
- Review leave utilization reports regularly

## Support

For questions or issues related to the new leave structure, contact the HR team or refer to the system documentation.

---

_Last Updated: September 1, 2025_
_System Version: Leave Management v2.0_
