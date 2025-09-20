# 🤖 Claude Code GitHub Actions Setup Guide
## 6FB Methodologies Workshop Integration

### 📋 Overview

This guide provides complete setup instructions for integrating Claude Code with your 6FB Methodologies GitHub repository. The integration includes AI-powered code analysis, security reviews, performance optimization, and automated deployment assistance.

**Cost Target**: $0.02-0.04 per session with comprehensive monitoring and budget controls.

---

## 🚀 Quick Setup (5 Minutes)

### 1. Install Claude GitHub App

1. **Navigate to GitHub Apps**: https://github.com/apps/claude-code
2. **Click "Install"** and select your `c50bossio/6fb-methodologies` repository
3. **Grant permissions** for:
   - Contents (read)
   - Issues (write)
   - Pull requests (write)
   - Metadata (read)
   - Actions (read)

### 2. Add Anthropic API Key

1. **Go to Repository Settings**:
   ```
   https://github.com/c50bossio/6fb-methodologies/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add secret**:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key from https://console.anthropic.com/

### 3. Verify Installation

1. **Create a test issue** in your repository
2. **Comment**: `@claude hello`
3. **Wait 30-60 seconds** for Claude to respond
4. **Success**: Claude responds with a helpful message

---

## 📁 Files Created

Your repository now includes these new workflow files:

```
.github/workflows/
├── claude-code.yml              # Main @claude mention handler
├── claude-security-review.yml   # Automated security analysis
├── claude-performance.yml       # Performance optimization
└── claude-vercel-integration.yml # Vercel deployment integration

.claude/
├── config.yml                   # Claude Code configuration
└── cost-optimization.md         # Cost control documentation
```

---

## 🎯 Key Features

### 1. @claude Mention Functionality
**Usage**: Comment `@claude [command]` on any PR or issue

**Popular Commands**:
- `@claude review` - Comprehensive code review
- `@claude security-check` - Security vulnerability analysis
- `@claude performance` - Performance optimization suggestions
- `@claude fix [issue]` - Automated bug fixes
- `@claude explain [code]` - Code explanation
- `@claude test` - Generate test cases

### 2. Automated Reviews
**Triggers**: Automatically on PR creation for:
- API route changes
- Component modifications
- Configuration updates
- Security-sensitive files

**Features**:
- Security vulnerability detection
- Performance optimization suggestions
- Best practices enforcement
- Code quality analysis

### 3. Vercel Integration
**Triggers**: On deployment events
- Pre-deployment analysis
- Post-deployment validation
- Cost optimization recommendations
- Performance monitoring setup

### 4. Cost Optimization
**Budget Controls**:
- $0.02-0.04 per session target
- Smart model selection (Haiku vs Sonnet)
- Token usage optimization
- Rate limiting and timeouts

---

## 🔧 Configuration

### Model Selection Strategy
```yaml
# Optimized for cost-effectiveness
Primary: claude-3-5-sonnet-20241022    # Complex analysis
Fallback: claude-3-5-haiku-20241022    # Simple tasks
```

### Trigger Optimization
```yaml
# Smart triggering to control costs
Max files per review: 20
Security scan triggers: API, auth, middleware files
Performance analysis: Components, pages, config files
```

### Cost Monitoring
```yaml
# Budget alerts and controls
Daily limit: $1.00
Session limit: $0.10
Weekly budget: ~$1.50
```

---

## 🛡️ Security Features

### Automated Security Analysis
**Triggers on changes to**:
- `src/app/api/**` - API security
- `src/lib/auth/**` - Authentication
- `src/middleware/**` - Request handling
- `*.env*` - Environment variables
- `package.json` - Dependencies

**Analysis Includes**:
- OWASP Top 10 compliance
- Input validation checks
- Authentication/authorization review
- Data protection analysis
- Dependency vulnerability scanning

### Security Report Generation
- **Severity ratings**: Critical, High, Medium, Low
- **Remediation suggestions**: Specific code examples
- **Compliance checks**: Security best practices
- **Automated issue creation**: For critical findings

---

## ⚡ Performance Features

### Performance Analysis
**Triggers on changes to**:
- React components
- Next.js pages
- Configuration files
- Package dependencies

**Analysis Includes**:
- Bundle size optimization
- React performance patterns
- Core Web Vitals impact
- Database query optimization
- Caching strategies

### Vercel-Specific Optimization
- Edge function recommendations
- Build time optimization
- Cost reduction strategies
- Performance monitoring setup

---

## 📊 Usage Examples

### 1. Code Review Request
```
Comment on PR: @claude review this API endpoint for security issues
```
**Expected Response**: Detailed security analysis with specific recommendations

### 2. Performance Optimization
```
Comment on PR: @claude analyze the performance impact of these component changes
```
**Expected Response**: Bundle size impact, re-render analysis, optimization suggestions

### 3. Bug Fix Request
```
Comment on issue: @claude fix the authentication bug described in this issue
```
**Expected Response**: Code changes with implementation suggestions

### 4. Architecture Guidance
```
Comment on PR: @claude review the overall architecture of this new feature
```
**Expected Response**: Design pattern analysis, best practices, scalability considerations

---

## 💰 Cost Management

### Expected Costs
| Operation | Estimated Cost | Frequency |
|-----------|---------------|-----------|
| @claude mention | $0.03 | As needed |
| Auto PR review | $0.02 | Per PR |
| Security scan | $0.04 | Critical changes |
| Performance analysis | $0.02 | Component changes |
| Issue triage | $0.01 | New issues |

### Budget Monitoring
- **Daily alerts** if spending > $0.50
- **Weekly summary** of usage patterns
- **Automatic limits** to prevent overages
- **Cost tracking** by operation type

### Optimization Tips
1. **Use specific commands** instead of general requests
2. **Focus on changed files** rather than entire codebase
3. **Batch related questions** in single sessions
4. **Use @claude for complex analysis** only

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Claude Not Responding
**Symptoms**: No response to @claude mentions
**Solutions**:
- Check ANTHROPIC_API_KEY is set correctly
- Verify GitHub App permissions
- Ensure you're mentioning `@claude` exactly
- Check repository secrets configuration

#### 2. Workflow Failures
**Symptoms**: GitHub Actions failing
**Solutions**:
- Check Actions tab for error details
- Verify all required secrets are configured
- Review workflow logs for specific errors

#### 3. High Costs
**Symptoms**: Budget alerts triggered
**Solutions**:
- Review usage in cost tracking logs
- Adjust trigger thresholds in config.yml
- Use more specific commands
- Enable rate limiting

### Support Channels
- **GitHub Issues**: For workflow problems
- **Claude Documentation**: https://docs.claude.com/
- **Anthropic Support**: For API key issues

---

## 🚀 Advanced Configuration

### Custom Triggers
Edit `.claude/config.yml` to customize:

```yaml
triggers:
  pr_review:
    min_files: 1
    max_files: 15        # Reduce for cost control
    file_patterns:
      high_priority:
        - "src/app/api/**"
        - "src/lib/auth/**"
```

### Model Selection
```yaml
model_selection:
  security_analysis: "claude-3-5-sonnet-20241022"
  performance_review: "claude-3-5-haiku-20241022"
  issue_triage: "claude-3-5-haiku-20241022"
```

### Custom Commands
Add project-specific commands:

```yaml
custom_commands:
  - name: "6fb-review"
    description: "Review for Six Figure Barber methodology compliance"
    model: "claude-3-5-sonnet-20241022"
    focus: ["business-logic", "user-experience", "conversion-optimization"]
```

---

## 📈 Success Metrics

### Track These KPIs
- **Security issues caught**: Vulnerabilities prevented
- **Performance improvements**: Core Web Vitals gains
- **Code quality**: Review feedback implementation
- **Development speed**: Faster issue resolution
- **Cost efficiency**: Budget adherence

### Weekly Review Checklist
- [ ] Review cost summary and trends
- [ ] Analyze most useful Claude interactions
- [ ] Adjust triggers based on usage patterns
- [ ] Update configuration for optimization
- [ ] Plan next week's Claude usage strategy

---

## 🎉 Next Steps

### Immediate (Next 24 Hours)
1. ✅ Test @claude mention functionality
2. ✅ Create a test PR to verify automated reviews
3. ✅ Review cost tracking in Actions logs
4. ✅ Familiarize team with @claude commands

### This Week
1. **Train your team** on Claude Code usage
2. **Set up cost monitoring** alerts
3. **Customize triggers** for your workflow
4. **Integrate with Vercel** deployment process

### Ongoing Optimization
1. **Weekly cost reviews** and optimization
2. **Monthly configuration updates** based on usage
3. **Quarterly strategy reviews** and improvements
4. **Continuous learning** from Claude interactions

---

## 🎯 Success Checklist

- [ ] Claude responds to @claude mentions
- [ ] Automated PR reviews are working
- [ ] Security scans trigger on API changes
- [ ] Performance analysis runs on component changes
- [ ] Cost tracking shows target $0.02-0.04 per session
- [ ] Team is trained on Claude commands
- [ ] Vercel integration is monitoring deployments
- [ ] Budget alerts are configured and working

**Congratulations!** Your 6FB Methodologies repository now has enterprise-grade AI-powered development assistance with cost-optimized Claude Code integration.

---

**Questions or Issues?** Create an issue in your repository with the `claude-support` label for assistance.