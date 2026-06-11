# Security

## Reporting a vulnerability

**Please do not report security issues through public GitHub issues.**

If you believe you have found a security vulnerability in this project, please report it by emailing: [ADD YOUR SECURITY EMAIL]

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested remediation if you have one

We will acknowledge your report within 5 working days and aim to resolve confirmed vulnerabilities within 30 days.

## What counts as a security issue

- Exposure of personal data through tool outputs
- Authentication or authorisation bypass (when auth layers are implemented)
- Injection vulnerabilities in MCP tool inputs
- Insecure handling of government API credentials
- Any mechanism that could allow tool outputs to be manipulated to provide false legal or benefits information

## What does not count as a security issue

- The tools are at discovery/alpha stage and do not handle personal data
- The public documentation is intentionally publicly accessible
- Suggestions for improving output quality belong in GitHub Issues

## Responsible disclosure

We follow responsible disclosure principles. We ask that you:
- Allow reasonable time for us to investigate and fix the issue before public disclosure
- Do not access, modify, or delete data belonging to others
- Do not conduct attacks that could harm service availability

We will credit researchers who report valid security issues (if they wish to be credited) in our changelog.

## Scope

This security policy covers:
- The MCP server source code in `/src/`
- The documentation publishing infrastructure
- Any API integrations

This policy does not cover:
- GOV.UK, Environment Agency, CQC or other government APIs that the tools connect to — report those issues to the relevant department
- GitHub's own infrastructure

## Contact

Security reports: [ADD YOUR SECURITY EMAIL]@[domain].gov.uk
General questions: raise a GitHub Issue or Discussion
