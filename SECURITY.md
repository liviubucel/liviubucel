# Security Policy

## Reporting a vulnerability

Please report suspected security issues privately by email to **security@liviubucel.com**.

Do not publish vulnerability details, credentials, personal data, proof-of-concept exploit material, or sensitive infrastructure information in a public GitHub issue, discussion, pull request, or commit.

When reporting, include only the information needed to reproduce and assess the issue. If logs or screenshots contain tokens, email addresses, IP addresses, or other personal/sensitive data, redact them where possible.

## Scope

Security reports concerning the public website and code in this repository are welcome. Third-party services and infrastructure not controlled by this project are outside scope unless the issue is caused by this project's integration with them.

## Repository hygiene

Credentials and private operational configuration must not be committed to this repository. Runtime secrets are supplied through protected environment/secret stores. Automated dependency auditing and secret scanning run in CI.

If a secret is accidentally committed, it must be revoked or rotated immediately; removing it from the latest file alone is not considered sufficient remediation.

## Disclosure

Please allow a reasonable period for investigation and remediation before public disclosure. Confirmed reports will be handled with an emphasis on limiting user impact and avoiding unnecessary exposure of sensitive implementation details.
