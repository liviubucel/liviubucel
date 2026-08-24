<h1 align="center">Liviu Bucel</h1>

<p align="center">
  <strong>Cybersecurity · Security Engineering · Ethical Hacking · Digital Investigation</strong>
</p>

<p align="center">
  I investigate how attacks work and build practical systems that reduce real-world security risk.
</p>

<p align="center">
  <a href="https://www.liviubucel.com/">Portfolio</a> ·
  <a href="https://uk.linkedin.com/in/liviubucel">LinkedIn</a> ·
  <a href="https://www.liviubucel.com/blog/">Security Writing</a> ·
  <a href="mailto:contact@liviubucel.com">Contact</a>
</p>

---

## Profile

I'm a UK-based cybersecurity specialist focused on practical, evidence-led security work across **ethical hacking, digital forensics, vulnerability research, security operations, and security engineering**.

I care about understanding systems deeply enough to explain both **how they fail** and **how to make them harder to break**. That can mean investigating an incident, validating a vulnerability, hardening an Internet-facing service, automating certificate infrastructure, or designing a security platform with clear trust boundaries.

A significant part of my applied security engineering work is developed through **[ZebraByte](https://zebrabyte.ro/)**, where I work on cybersecurity and compliance systems spanning **threat intelligence, security tooling, cloud infrastructure, PKI/TLS automation, identity, and security-focused platform engineering**.

This profile contains public projects and selected technical work. Production-sensitive systems, credentials, customer data, and operational security details stay private by design.

## Core focus

- **Ethical hacking & security assessment** — understanding attack surfaces, validating security weaknesses, and turning findings into actionable remediation.
- **Digital forensics & incident investigation** — evidence-led analysis of security events, attacker activity, and incident context.
- **Threat intelligence** — defensive monitoring of exposed data, ransomware activity, dark-web sources, and external risk signals.
- **Security engineering** — authentication boundaries, tenant isolation, abuse controls, auditability, secure APIs, and cloud-native security architecture.
- **PKI, TLS & Internet infrastructure** — ACME automation, DNS validation, certificate issuance and renewal, and secure service delivery.
- **Vulnerability research** — understanding exploitability, technical impact, and practical defensive mitigations.

## Selected work

### [ZebraByte Dark Web Intelligence](https://github.com/liviubucel/darkweb-scan)

A defensive dark-web monitoring and threat-intelligence platform designed for **exposure discovery, investigation, and continuous monitoring**.

The public architecture uses **Cloudflare Workers, Workflows, Queues, D1, R2, Workers AI, Analytics Engine, rate limiting, and a constrained Tor collector**. The collector is deliberately separated from customer accounts, billing, persistent application data, and provider credentials, with retrieved Tor content treated as untrusted evidence.

`Threat Intelligence` · `Cloudflare Workers` · `Tor` · `D1` · `R2` · `Workers AI` · `TypeScript`

### [SSL Certificate Generator](https://github.com/liviubucel/ssl-generator)

An ACME-based certificate automation system for issuing and managing TLS certificates through a web interface.

It supports **Let's Encrypt and ZeroSSL, HTTP-01 and DNS-01 validation, wildcard certificates, certificate downloads, automated renewal, and renewal notifications**. The system combines a Cloudflare Worker with a restricted ACME backend and keeps service-to-service access authenticated.

[Live demo](https://ssl-gratis.zebrabyte.ro/) · [Source](https://github.com/liviubucel/ssl-generator)

`ACME` · `TLS/PKI` · `Cloudflare Workers` · `DNS` · `TypeScript` · `Automation`

### [ACME SSL Engine](https://github.com/liviubucel/ssl-acme-engine)

A lightweight, portable ACME automation project built around **ACME.sh, OpenSSL, Docker, and Railway**. It demonstrates certificate issuance and renewal workflows while documenting private-key handling, DNS credential security, and certificate lifecycle considerations.

`ACME.sh` · `OpenSSL` · `Docker` · `Shell` · `PKI`

## Engineering stack

**Security & infrastructure**  
`Cloudflare Workers` `D1` `R2` `Queues` `Workflows` `Workers AI` `Docker` `Tor` `ACME` `DNS` `HTTP` `TLS/PKI`

**Development**  
`TypeScript` `JavaScript` `Node.js` `Astro` `REST APIs` `SQL` `GitHub Actions`

**Security disciplines**  
`Ethical Hacking` `DFIR` `Threat Intelligence` `Vulnerability Research` `Security Operations` `Cloud Security` `API Security`

## Security research & writing

I publish technical notes, security analysis, and selected threat-intelligence updates at **[liviubucel.com/blog](https://www.liviubucel.com/blog/)**.

Current public work includes monitoring and documenting Romania-linked ransomware and breach claims while clearly distinguishing **reported attacker claims from independently verified incidents**.

## How I approach security

- **Evidence over assumptions.** A claim should be testable, reproducible, or clearly labelled as unverified.
- **Trust boundaries first.** Authentication, authorization, tenancy, secrets, and data ownership are architectural concerns, not afterthoughts.
- **Least privilege by default.** Services and credentials should receive only the access they actually need.
- **Untrusted input stays untrusted.** External data, scraped content, user input, and AI context require explicit validation and isolation.
- **Security should survive production.** Controls need observability, failure handling, rate limits, audit trails, and maintainable operational paths.

## Elsewhere

- **Portfolio:** [liviubucel.com](https://www.liviubucel.com/)
- **ZebraByte:** [zebrabyte.ro](https://zebrabyte.ro/)
- **LinkedIn:** [linkedin.com/in/liviubucel](https://uk.linkedin.com/in/liviubucel)
- **GitHub:** [github.com/liviubucel](https://github.com/liviubucel)
- **Email:** [contact@liviubucel.com](mailto:contact@liviubucel.com)

---

<p align="center">
  <strong>JUST DO IT, BUT DO IT WELL.</strong>
</p>
