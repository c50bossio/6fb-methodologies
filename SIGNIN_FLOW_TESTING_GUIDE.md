# Signin Flow Testing Guide

## Implementation Summary

The signin page has been completely rewritten with a multi-step flow that intelligently routes users based on their 6FB membership status and account state.

**File Updated:** `/Users/bossio/6fb-methodologies/src/app/app/signin/page.tsx`

## New Flow Architecture

### Step 1: Email Entry
User enters their email address. The system makes TWO API calls:

1. **Membership Check**: `POST /api/verify-member`
   - Checks if user is a verified 6FB member (from CSV/Skool)

2. **Account Check**: `POST https://app.6fbmentorship.com/api/auth/check-account`
   - Checks if account exists in backend database
   - Checks if account has a password set

### Step 2: Intelligent Routing

Based on the results, users are routed to one of these outcomes:

| Scenario | 6FB Member | Account Exists | Has Password | Action |
|----------|-----------|----------------|--------------|--------|
| 1 | ✅ Yes | ❌ No | N/A | Auto-create account → Set Password step |
| 2 | ✅ Yes | ✅ Yes | ❌ No | Set Password step |
| 3 | ✅ Yes | ✅ Yes | ✅ Yes | Password Login step |
| 4 | ❌ No | ❌ No | N/A | Show error: "No account found. Please purchase..." |
| 5 | ❌ No | ✅ Yes | ✅ Yes | Password Login step |

### Step 3: Password Entry or Set Password

**Password Login (Scenarios 3 & 5):**
- Shows email (read-only)
- Password field with show/hide toggle
- "Sign In" button
- Calls: `POST https://app.6fbmentorship.com/api/auth/signin`
- On success: Stores JWT in sessionStorage → Redirects to `/app/dashboard`

**Set Password (Scenarios 1 & 2):**
- Shows green badge: "✓ Verified 6FB Member - Free Access"
- Shows email (read-only)
- Create Password field with show/hide toggle
- Confirm Password field with show/hide toggle
- Validates: Passwords match + minimum 8 characters
- "Create Account & Sign In" button
- Calls: `POST https://app.6fbmentorship.com/api/auth/set-password`
- On success: Auto-login → Stores JWT → Redirects to `/app/dashboard`

## Key Features

### UI/UX Enhancements
- Dynamic card titles and descriptions based on current step
- Green badge for verified 6FB members on set-password step
- Password visibility toggles (eye/eye-off icons)
- "Use a different email" link to go back to email step
- Loading states with spinners
- Error messages with proper styling
- Footer links only shown on email step

### Security
- Client-side password validation (8+ characters, must match)
- Secure password input fields
- JWT stored in sessionStorage
- All API calls use HTTPS
- credentials: 'include' for cookie support

### Error Handling
- Network errors caught and displayed
- API errors parsed and shown to user
- Invalid credentials handling
- Password mismatch validation

## Testing Checklist

### Scenario 1: New 6FB Member (Auto-create)
- [ ] Email: Use a 6FB member email NOT in backend (from CSV)
- [ ] Expected: Auto-creates account → Set password step
- [ ] Verify: Green badge shown
- [ ] Enter password (8+ chars) and confirm
- [ ] Expected: Auto-login → Dashboard redirect
- [ ] Verify: sessionStorage has 'auth_token'

### Scenario 2: 6FB Member with Account but No Password
- [ ] Email: Use a 6FB member email that exists in backend but has `password: null`
- [ ] Expected: Set password step
- [ ] Verify: Green badge shown
- [ ] Enter password and confirm
- [ ] Expected: Auto-login → Dashboard redirect

### Scenario 3: 6FB Member with Full Account
- [ ] Email: Use a 6FB member email with existing account and password
- [ ] Expected: Password login step
- [ ] Enter correct password
- [ ] Expected: Successful login → Dashboard redirect

### Scenario 4: Non-member with No Account
- [ ] Email: Use random email not in CSV and not in backend
- [ ] Expected: Error message "No account found. Please purchase..."
- [ ] Verify: "View Pricing" link shown

### Scenario 5: Non-member with Existing Account (Paid App User)
- [ ] Email: Use email with backend account but NOT in 6FB CSV
- [ ] Expected: Password login step
- [ ] Enter correct password
- [ ] Expected: Successful login → Dashboard redirect

### Edge Cases to Test
- [ ] Empty email → Browser validation error
- [ ] Invalid email format → Browser validation error
- [ ] Wrong password on login → Error message shown
- [ ] Passwords don't match on set-password → Error shown
- [ ] Password less than 8 chars → Error shown
- [ ] "Use a different email" link → Returns to email step, clears state
- [ ] Network error → Error message shown
- [ ] Multiple rapid submissions → Loading state prevents double-submit

### Visual Testing
- [ ] Logo displays correctly
- [ ] Card styling matches existing design (black bg, zinc-900 card)
- [ ] Green badge has proper lime colors
- [ ] Password toggle buttons work correctly
- [ ] Loading spinners animate
- [ ] Error messages have red styling
- [ ] Links have hover effects (lime-500)
- [ ] Responsive on mobile (test viewport widths)

### Integration Testing
- [ ] JWT token stored in sessionStorage
- [ ] Dashboard receives token correctly
- [ ] SSO to other apps works with new token
- [ ] Logout clears sessionStorage
- [ ] Back button behavior is sensible

## API Dependencies

This implementation depends on these backend endpoints being functional:

1. **Local API:**
   - `POST /api/verify-member` - 6FB membership verification

2. **Backend APIs (app.6fbmentorship.com):**
   - `POST /api/auth/check-account` - Account existence check
   - `POST /api/auth/create-member-account` - Auto-create for 6FB members
   - `POST /api/auth/set-password` - Set password for new accounts
   - `POST /api/auth/signin` - Standard login

## State Management

The component uses these state variables:

```typescript
// Step tracking
currentStep: 'email' | 'password' | 'set-password'

// Form data
email: string
password: string
confirmPassword: string
showPassword: boolean
showConfirmPassword: boolean

// UI state
isLoading: boolean
error: string | null

// Membership data
is6FBMember: boolean
accountStatus: { exists: boolean; hasPassword: boolean; userId?: string }
```

## Success Criteria

✅ All 5 scenarios route correctly
✅ Password validation works
✅ Auto-create for 6FB members functions
✅ Auto-login after set-password works
✅ Error messages display correctly
✅ JWT stored and dashboard accessible
✅ "Back to email" navigation works
✅ UI matches existing design patterns
✅ Loading states prevent double-submission
✅ No TypeScript compilation errors

## Known Limitations

- No forgot password flow yet (future enhancement)
- No email verification step (relies on 6FB membership verification)
- Password reset must be handled separately (not in this flow)

## Next Steps

After testing this implementation:
1. Verify all backend endpoints are deployed and working
2. Test with real 6FB member emails
3. Test with existing paid app users
4. Monitor error logs for edge cases
5. Consider adding analytics tracking for each step
6. Add forgot password link if needed

---

**Implementation Date:** 2026-01-11
**File:** `/Users/bossio/6fb-methodologies/src/app/app/signin/page.tsx`
**Lines of Code:** 504 lines
