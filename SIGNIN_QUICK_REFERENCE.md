# Multi-Step Signin Flow - Quick Reference Card

## File Location
`/Users/bossio/6fb-methodologies/src/app/app/signin/page.tsx`

## Quick Stats
- **Lines of Code:** 504
- **React Hooks:** 13 (useState, useRouter)
- **API Calls:** 5 different endpoints
- **Steps:** 3 (email, password, set-password)
- **Scenarios:** 5 routing paths

## The Flow in 30 Seconds

### Step 1: Email
```
User enters email → System checks:
├─ Is 6FB member? (POST /api/verify-member)
└─ Has account? (POST /api/auth/check-account)
   └─ Has password?
```

### Step 2: Routing Decision
```
IF 6FB + No Account    → Auto-create account → Set Password
IF 6FB + No Password   → Set Password
IF 6FB + Has Password  → Password Login
IF Not 6FB + No Account → Error (must purchase)
IF Not 6FB + Has Account → Password Login
```

### Step 3: Complete Action
```
Set Password Flow:
  Show green badge → Create password → Auto-login → Dashboard

Password Login Flow:
  Enter password → Login → Dashboard
```

## Key State Variables
```typescript
currentStep: 'email' | 'password' | 'set-password'
email: string
password: string
confirmPassword: string
is6FBMember: boolean
accountStatus: { exists: boolean; hasPassword: boolean; userId?: string }
```

## API Endpoints

| Endpoint | Purpose | Body | Response |
|----------|---------|------|----------|
| `/api/verify-member` | Check 6FB membership | `{ email }` | `{ verified: boolean }` |
| `/api/auth/check-account` | Check account exists | `{ email }` | `{ exists, hasPassword, userId }` |
| `/api/auth/create-member-account` | Auto-create for 6FB | `{ email }` | `{ userId }` |
| `/api/auth/set-password` | Set password | `{ email, password }` | `{ data: { token } }` |
| `/api/auth/signin` | Normal login | `{ email, password }` | `{ data: { token } }` |

## Password Rules
- Minimum 8 characters
- Must match confirmation
- Validated client-side before submission

## UI Features

### Email Step
- Email input
- "Continue" button
- "View Pricing" link
- "Back to home" link

### Password Login Step
- Email (read-only)
- Password input with toggle
- "Sign In" button
- "Use a different email" link

### Set Password Step
- Green badge: "✓ Verified 6FB Member - Free Access"
- Email (read-only)
- Create password input with toggle
- Confirm password input with toggle
- "Create Account & Sign In" button
- "Use a different email" link

## Testing Quick Hits

### Test Scenario 1 (6FB Member - New)
```bash
Email: verified_member@example.com (in CSV, not in backend)
Expected: Auto-create → Set password → Dashboard
```

### Test Scenario 2 (6FB Member - No Password)
```bash
Email: member_no_pw@example.com (in CSV, in backend, password=null)
Expected: Set password → Dashboard
```

### Test Scenario 3 (6FB Member - Full Account)
```bash
Email: member@example.com (in CSV, in backend, has password)
Expected: Password login → Dashboard
```

### Test Scenario 4 (Non-member - New)
```bash
Email: random@example.com (not in CSV, not in backend)
Expected: Error message + View Pricing link
```

### Test Scenario 5 (Paid App User)
```bash
Email: paid_user@example.com (not in CSV, in backend, has password)
Expected: Password login → Dashboard
```

## Common Issues & Solutions

### Input onChange Error
❌ `onChange={(e) => setEmail(e.target.value)}`
✅ `onChange={setEmail}`

The Input component expects `(value: string) => void`, not the full event.

### JWT Not Stored
Check: `sessionStorage.getItem('auth_token')`
Should be set after successful login or set-password.

### Error: "No account found"
This is correct behavior for Scenario 4 (non-member, no account).
User should click "View Pricing" to purchase access.

### Password Validation Not Working
- Check: `password.length >= 8`
- Check: `password === confirmPassword`
- These are validated client-side before API call.

### "Use a different email" Not Working
Should call `handleBackToEmail()` which:
- Sets step to 'email'
- Clears password fields
- Clears error
- Resets membership state

## Styling Patterns

```typescript
// Card
className="bg-zinc-900 border-zinc-800"

// Input
className="bg-zinc-800 border-zinc-700 text-white"

// Button (primary)
className="bg-lime-500 hover:bg-lime-600 text-black"

// Error box
className="bg-red-900/30 border border-red-800"

// Success badge
className="bg-lime-900/30 border border-lime-800"

// Link
className="text-lime-500 hover:text-lime-400"
```

## Success Indicators

✅ No TypeScript errors
✅ Build succeeds
✅ All 5 scenarios route correctly
✅ Password validation works
✅ JWT stored in sessionStorage
✅ Dashboard redirect works
✅ "Back" navigation works
✅ Error messages display
✅ Loading states show

## Files to Review
1. `SIGNIN_FLOW_TESTING_GUIDE.md` - Full testing checklist
2. `SIGNIN_FLOW_DIAGRAM.md` - Visual flow diagrams
3. `PHASE3_SIGNIN_IMPLEMENTATION_SUMMARY.md` - Complete summary

---

**Last Updated:** 2026-01-11
**Status:** Ready for Testing
