# Multi-Step Signin Flow - Visual Diagram

## Complete Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STEP 1: EMAIL ENTRY                           │
│                                                                      │
│  User enters email → Click "Continue"                                │
│                                                                      │
│  Two parallel API calls:                                             │
│  1. POST /api/verify-member         (6FB membership check)           │
│  2. POST /api/auth/check-account    (account existence check)        │
│                                                                      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ROUTING DECISION MATRIX                           │
│                                                                      │
│  ┌─────────────┬──────────┬──────────┬──────────┬──────────────┐   │
│  │ Scenario    │ 6FB Mem  │ Account  │ Password │ Action       │   │
│  ├─────────────┼──────────┼──────────┼──────────┼──────────────┤   │
│  │ 1           │ ✅       │ ❌       │ N/A      │ Auto-create  │   │
│  │ 2           │ ✅       │ ✅       │ ❌       │ Set Password │   │
│  │ 3           │ ✅       │ ✅       │ ✅       │ Login        │   │
│  │ 4           │ ❌       │ ❌       │ N/A      │ Error        │   │
│  │ 5           │ ❌       │ ✅       │ ✅       │ Login        │   │
│  └─────────────┴──────────┴──────────┴──────────┴──────────────┘   │
│                                                                      │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│ S1    │  │ S2    │  │ S3    │  │ S4    │  │ S5    │
└───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
    │          │          │          │          │
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼

┌────────────────────────────────────────────────────────────────────┐
│  SCENARIO 1: New 6FB Member (Auto-create Account)                  │
│                                                                     │
│  1. POST /api/auth/create-member-account                            │
│     Body: { email }                                                 │
│     Response: { userId }                                            │
│                                                                     │
│  2. Navigate to: SET PASSWORD STEP                                 │
│     ↓                                                               │
│     Show: ✓ Verified 6FB Member - Free Access (green badge)        │
│     Fields: Create Password + Confirm Password                     │
│     Button: "Create Account & Sign In"                              │
│                                                                     │
│  3. POST /api/auth/set-password                                     │
│     Body: { email, password }                                       │
│     Response: { token }                                             │
│                                                                     │
│  4. Store token → sessionStorage.setItem('auth_token', token)       │
│                                                                     │
│  5. AUTO-LOGIN → router.push('/app/dashboard')                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  SCENARIO 2: 6FB Member with Account but No Password               │
│                                                                     │
│  1. Navigate to: SET PASSWORD STEP                                 │
│     ↓                                                               │
│     Show: ✓ Verified 6FB Member - Free Access (green badge)        │
│     Fields: Create Password + Confirm Password                     │
│     Button: "Create Account & Sign In"                              │
│                                                                     │
│  2. POST /api/auth/set-password                                     │
│     Body: { email, password }                                       │
│     Response: { token }                                             │
│                                                                     │
│  3. Store token → sessionStorage.setItem('auth_token', token)       │
│                                                                     │
│  4. AUTO-LOGIN → router.push('/app/dashboard')                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  SCENARIO 3: 6FB Member with Full Account                          │
│                                                                     │
│  1. Navigate to: PASSWORD LOGIN STEP                               │
│     ↓                                                               │
│     Show: Email (read-only)                                         │
│     Fields: Password (with show/hide toggle)                       │
│     Button: "Sign In"                                               │
│                                                                     │
│  2. POST /api/auth/signin                                           │
│     Body: { email, password }                                       │
│     Response: { data: { token } }                                   │
│                                                                     │
│  3. Store token → sessionStorage.setItem('auth_token', token)       │
│                                                                     │
│  4. router.push('/app/dashboard')                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  SCENARIO 4: Not 6FB Member + No Account (ERROR)                   │
│                                                                     │
│  Show error message:                                                │
│  "No account found. Please purchase an app or verify your 6FB       │
│   membership."                                                      │
│                                                                     │
│  Display: "View Pricing" link → /app/pricing                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  SCENARIO 5: Not 6FB Member + Has Account (Paid App User)          │
│                                                                     │
│  1. Navigate to: PASSWORD LOGIN STEP                               │
│     ↓                                                               │
│     Show: Email (read-only)                                         │
│     Fields: Password (with show/hide toggle)                       │
│     Button: "Sign In"                                               │
│                                                                     │
│  2. POST /api/auth/signin                                           │
│     Body: { email, password }                                       │
│     Response: { data: { token } }                                   │
│                                                                     │
│  3. Store token → sessionStorage.setItem('auth_token', token)       │
│                                                                     │
│  4. router.push('/app/dashboard')                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## UI States

### Email Step
```
┌────────────────────────────────────┐
│  [Logo]                            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Sign In                      │ │
│  │  Enter your email to continue │ │
│  │                               │ │
│  │  Email                        │ │
│  │  [you@example.com          ] │ │
│  │                               │ │
│  │  [Continue ↵]                 │ │
│  │                               │ │
│  │  Don't have access yet?       │ │
│  │  View Pricing                 │ │
│  │                               │ │
│  │  ← Back to home               │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

### Password Login Step
```
┌────────────────────────────────────┐
│  [Logo]                            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Enter Password               │ │
│  │  Enter your password to sign  │ │
│  │  in                           │ │
│  │                               │ │
│  │  Email                        │ │
│  │  [email@example.com]          │ │
│  │                               │ │
│  │  Password                     │ │
│  │  [••••••••••] [👁]           │ │
│  │                               │ │
│  │  [Sign In ↵]                  │ │
│  │                               │ │
│  │  ← Use a different email      │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

### Set Password Step (6FB Member)
```
┌────────────────────────────────────┐
│  [Logo]                            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Create Password              │ │
│  │  Set up your password for     │ │
│  │  free 6FB member access       │ │
│  │                               │ │
│  │  ┌──────────────────────────┐│ │
│  │  │ ✓ Verified 6FB Member -  ││ │
│  │  │   Free Access            ││ │
│  │  └──────────────────────────┘│ │
│  │                               │ │
│  │  Email                        │ │
│  │  [email@example.com]          │ │
│  │                               │ │
│  │  Create Password              │ │
│  │  [••••••••••] [👁]           │ │
│  │                               │ │
│  │  Confirm Password             │ │
│  │  [••••••••••] [👁]           │ │
│  │                               │ │
│  │  [Create Account & Sign In ↵] │ │
│  │                               │ │
│  │  ← Use a different email      │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

### Error State (Not Member + No Account)
```
┌────────────────────────────────────┐
│  [Logo]                            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Sign In                      │ │
│  │  Enter your email to continue │ │
│  │                               │ │
│  │  ┌──────────────────────────┐│ │
│  │  │ ❌ No account found.     ││ │
│  │  │ Please purchase an app or││ │
│  │  │ verify your 6FB          ││ │
│  │  │ membership.              ││ │
│  │  └──────────────────────────┘│ │
│  │                               │ │
│  │  Email                        │ │
│  │  [user@example.com         ] │ │
│  │                               │ │
│  │  [Continue ↵]                 │ │
│  │                               │ │
│  │  Don't have access yet?       │ │
│  │  View Pricing                 │ │
│  │                               │ │
│  │  ← Back to home               │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

## Key Implementation Details

### State Variables
```typescript
// Step management
const [currentStep, setCurrentStep] = useState<'email' | 'password' | 'set-password'>('email');

// Form data
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

// UI toggles
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Membership tracking
const [is6FBMember, setIs6FBMember] = useState(false);
const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
```

### Password Validation Rules
1. Minimum 8 characters
2. Password and confirm password must match
3. Validated client-side before API call

### Navigation Features
- "Use a different email" button on password/set-password steps
- Resets state and returns to email step
- Clears password fields and error messages

### Security Features
- Passwords never stored in state after submission
- JWT stored in sessionStorage (not localStorage)
- credentials: 'include' for cookie support
- HTTPS for all API calls

---

**Created:** 2026-01-11
**Implementation File:** `/Users/bossio/6fb-methodologies/src/app/app/signin/page.tsx`
