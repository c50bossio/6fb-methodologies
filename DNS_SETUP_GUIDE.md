# DNS Setup Guide for 6FBmethodologies.com

## Step 1: Cloudflare DNS Configuration

Go to your Cloudflare dashboard for 6fbmethodologies.com and add these DNS records:

### A Records (Point to Vercel)
```
Type: A
Name: @
Content: 76.76.19.61
TTL: Auto
Proxy status: DNS only (gray cloud)
```

```
Type: A
Name: www
Content: 76.76.19.61
TTL: Auto
Proxy status: DNS only (gray cloud)
```

### CNAME Records (Alternative method)
Instead of A records, you can use CNAME:
```
Type: CNAME
Name: @
Content: cname.vercel-dns.com
TTL: Auto
Proxy status: DNS only (gray cloud)
```

```
Type: CNAME
Name: www
Content: cname.vercel-dns.com
TTL: Auto
Proxy status: DNS only (gray cloud)
```

## Step 2: Verify Domain in Vercel

After DNS propagation (5-30 minutes), run:
```bash
vercel domains add 6fbmethodologies.com
```

## Step 3: Check Domain Status
```bash
vercel domains ls
vercel domains inspect 6fbmethodologies.com
```

## Step 4: Deploy with Custom Domain
```bash
vercel --prod
```

## Troubleshooting

- **DNS Propagation**: Use `dig 6fbmethodologies.com` to check if DNS has propagated
- **SSL Certificate**: Vercel automatically provisions SSL certificates
- **Cloudflare Proxy**: Keep proxy status as "DNS only" during initial setup

## Expected Result
Your site will be available at:
- https://6fbmethodologies.com
- https://www.6fbmethodologies.com

Both will redirect to your Vercel deployment with automatic HTTPS.