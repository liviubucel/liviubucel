---
title: "Breșa Salesloft Drift (Salesforce) – Impactul asupra Cloudflare, cronologie completă și ghid de răspuns"
description: "1) Context & de ce contează, 2) Cum a funcționat atacul (pe scurt tehnic), 3) Impactul asupra Cloudflare – fapte cheie, 4) Cronologie detaliată (UTC), 5) Indicatori de compromis (IOCs), 6) Ce ar trebui să facă clienții Cloudflare acum, 7) Playbook de răspuns (Salesforce + integrații SaaS), 8) Ghid: căutarea secretelor în textul Case (defensiv), 9) Întărirea proceselor de suport (people & process), 10) Întrebări frecvente (FAQ)"
pubDate: 2025-09-08
category: "cybersecurity"
draft: false
---

{"en_GB": "

<blockquote>**TL;DR**: În august 2025, un atac de tip supply‑chain asupra aplicației **Salesloft Drift** a permis unui actor avansat (clasificat de Cloudflare ca **GRUB1**) să folosească **tokenuri OAuth** pentru a accesa instanțe **Salesforce** ale sute de organizații. În cazul **Cloudflare**, expunerea s‑a limitat la **câmpurile text** din **Salesforce Case** (tichete de suport) – **fără atașamente**. Au fost identificate **104 tokenuri API Cloudflare** în textul cazurilor; toate au fost **rotite** și **nu s‑a observat activitate malițioasă**
 asociată. Cloudflare a deconectat integrarea compromisă, a 
revocat/rotit credențiale pe scară largă, a notificat clienții și a 
publicat IOCs și cronologia.</blockquote>

## 

## 1) Context & de ce contează

Integrarea instrumentelor SaaS în CRM‑uri precum Salesforce este standardul industriei. **Drift** (prin **Salesloft**) oferă funcții de chat/lead‑gen și e conectat frecvent la Salesforce prin **OAuth**. În **august 2025**, o campanie coordonată a compromis aceste integrări, permițând **autentificarea la API‑urile Salesforce cu tokenuri OAuth valide**. Nu a fost un exploit „0‑day” în Salesforce, ci **abuz de integrare terță**.

**Ce s‑a furat?** La scară largă: textul unor obiecte Salesforce (în special **Case**), inclusiv **correspondența de suport** unde clienții, uneori, copiază **loguri, tokenuri, parole**.

**Ce NU s‑a furat în cazul Cloudflare?** Conform investigației Cloudflare, **nu au fost exfiltrate atașamente** ale cazurilor – doar **câmpurile text**.

### 2) Cum a funcționat atacul (pe scurt tehnic)

- **Sustragere tokenuri OAuth (și, în unele cazuri, refresh tokens)** asociate aplicației Drift/Salesloft.
- **Autentificare** la API‑urile Salesforce ale victimelor, folosind **scopes** acordate aplicației.
- **Recunoaștere**: interogări către /services/data/v58.0/sobjects/ pentru listare obiecte, .../Case/describe/ pentru schemă.
- **Exfiltrare**: utilizarea **Bulk API 2.0** pentru export rapid (ex. textul din **Case**), urmată de **ștergerea jobului** pentru a reduce urmele.
- **Persistență evitată**: atacatorul a mizat pe **re‑utilizarea tokenurilor** și pe fereastra scurtă înainte de **revocările masive** operate de furnizor.

### 3) Impactul asupra Cloudflare – fapte cheie

- **Fereastra atacului**: recon la **9 aug 2025**, acces și exfiltrare între **12–17 aug 2025**.
- **Suprafață**: **doar câmpuri text** din obiectul **Case** (tichete de suport); **fără atașamente**.
- **Date potențial sensibile** în text: contacte clienți, subiecte, conținut conversații; în unele cazuri, clienții au inclus **tokenuri/parole/loguri** în mesajele de suport.
- **104 tokenuri API Cloudflare identificate** în corpusul exfiltrat → **rotite** „din abundență de prudență”; **nu** s‑a observat activitate suspectă asociată.
- **Nicio compromitere** a serviciilor/infrastructurii Cloudflare.
- **Clienți notificați** direct + banner în Dashboard; recomandare: **rotați orice credențiale** partajate prin tichete de suport.

### 4) Cronologie detaliată (UTC)

<blockquote>
Fragment din reconstrucția forensică a activităților actorului urmărit de Cloudflare ca **GRUB1**
</blockquote>

- **2025‑08‑09 11:51:13** – Recon: User‑Agent **TruffleHog** încearcă verificarea unui token către endpointul Cloudflare client/v4/user/tokens/verify → **404** (invalid). IP: **44[.]215[.]108[.]109** (AWS).
- **2025‑08‑12 22:14:08/09** – Login în tenantul Salesforce Cloudflare; **GET** .../v58.0/sobjects/ (enumerare obiecte). IP: **44[.]215[.]108[.]109**.
- **2025‑08‑13 19:33:02–11** – Relogin + **describe** pe Case și **interogare largă** pe obiectul **Case**.
- **2025‑08‑14 00:17–11:09** – Recon avansat: **COUNT()** pe Account, Contact, User; analiză pe CaseTeamMemberHistory__c; fingerprint Organization (verificare producție vs sandbox); **GET /limits/** (capabilități/rate‑limits).
- **2025‑08‑16 19:26–19:28** – „**Dry‑run**”: **SELECT COUNT() FROM Case**.
- **2025‑08‑17 11:11:23–11:15:42** – Trecere pe altă infrastructură (IP: **208[.]68[.]36[.]90**, DigitalOcean), **Bulk API 2.0 job** pentru exportul **Case** (text), apoi **ștergere job**.
- **2025‑08‑20** – Revocări Drift → Salesforce la nivel de furnizor.
- **2025‑08‑23** – Salesforce & Salesloft notifică Cloudflare; începe răspunsul oficial.
- **2025‑08‑25** – Cloudflare extinde răspunsul: dezactivare cont Drift, revocare client ID/secrete, **dezinstalare totală** Salesloft (app + extensii browser), rotație integrări terțe în jurul Salesforce, **scanare proprie** pentru găsirea secretelor în corpus.
- **2025‑08‑26–29** – Re‑onboarding controlat al integrărilor, **rotație proactivă**; **104 tokenuri Cloudflare** detectate & rotite; **fără activitate suspectă** asociată.
- **2025‑09‑02** – Notificări finale către toți clienții afectați; publicarea rezultatelor și a IOCs.

### 5) Indicatori de compromis (IOCs)

- **IP**: 44[.]215[.]108[.]109 (AWS)
- **IP**: 208[.]68[.]36[.]90 (DigitalOcean)
- **User‑Agents** observate:
<li>TruffleHog (scanner secretes)
- Salesforce-Multi-Org-Fetcher/1.0 (tooling malițios)
- Salesforce-CLI/1.0
- python-requests/2.32.4
- Python/3.11 aiohttp/3.12.15
</li>

<blockquote>
**Notă**: lista UA nu e exhaustivă; multe tool‑uri își pot falsifica User‑Agent‑ul.
</blockquote>

### 

### 6) Ce ar trebui să facă **clienții Cloudflare** acum

- **Rotați toate credențialele** pe care le‑ați introdus vreodată în tichetele de suport Cloudflare (API tokens, chei, parole, webhook secrets etc.).
- **Revizuiți istoricul tichetelor**: Cloudflare Dashboard → **Support → Technical Support → My Activities** → filtrați/folosiți **„Download Cases”** pentru o analiză completă.
- **Verificați accesul** la conturile Cloudflare (audit tokens, IP allowlist, 2FA/SSO, loguri de acces).<li>**Ajustați procesele** interne: nu mai includeți **secrete**
 în texte de suport; folosiți canale securizate pentru partajarea 
temporară a credentialelor (ex. linkuri one‑time, Vault, 
DLP/secret‑sharing cu TTL scurt).</li>

### 

### 7) Playbook de răspuns (Salesforce + integrații SaaS)

#### 

#### 7.1 Containment imediat

- **Dezactivați/ștergeți** integrarea **Salesloft Drift** și **revocați** toate tokenurile/refresh tokens asociate.
- **Revocați sesiunile** pentru utilizatorii aplicației conectate (Connected App) și **resetați secretele** Connected App (Consumer Key/Secret).
- **Opriți temporar** celelalte integrări cu privilegii similare; re‑onboard controlat, cu **chei noi** și **scopuri minime** (least privilege).<li>**Blocați pe IP**
 (dacă e posibil) accesul API pentru intervalele observate (AWS 
44.215.108.109, DigitalOcean 208.68.36.90) până finalizați ancheta.</li>

#### 7.2 Eradicare & hardening

- **Rotație săptămânală** pentru secretele aplicațiilor terțe (model adoptat de Cloudflare post‑incident).
- **IP Allowlisting / Session Binding** pentru Connected Apps critice (legați sesiunile de IP‑uri așteptate/VPN‑uri).
- **Scopes minime & profil dedicat**: creați un **user tehnic** doar cu permisiunile strict necesare; eliminați „API Enabled” unde nu e absolut necesar.
- **DLP/Redaction** pe câmpuri de **Case**: detectați și mascați **tokenuri, parole, chei** în timp real (regex + entropie).
- **Rate‑limits & alerte** pentru **Bulk API Jobs** (creare, volum, ștergere rapidă a joburilor).

#### 7.3 Forensics & detecție (Salesforce Event Monitoring / SIEM)

Căutați:

- **Login‑uri API** de pe IP‑urile IOCs în fereastra 9–20 aug 2025.
- **User‑Agent‑uri** din lista de mai sus.
- Accese către rutele:
<li>GET /services/data/v58.0/sobjects/
- GET /services/data/v58.0/sobjects/Case/describe/
- GET /services/data/v58.0/limits/
- **SOQL** cu SELECT COUNT() FROM Case
- Evenimente **Bulk API 2.0** (creare job → exfiltrare → **delete job** la scurt timp)
</li>

<blockquote><p>**Sugestii de câmpuri (Event Monitoring)**: 
LoginEvent, ApiEvent, BulkApiResult, ConnectedAppOAuthUsage, Uri, 
ClientIp, UserAgent, RequestStatus, RowsProcessed, QueryText.</p></blockquote>

### 

### 8) Ghid: căutarea secretelor în textul **Case** (defensiv)

<blockquote>
Dacă aveți exporturi vechi sau backupuri ale câmpurilor text, rulați o scanare defensivă.
</blockquote>

Exemple **regex** utile (defensive patterns):

- **AWS Access Key ID**: \\\\b(A3T|AKIA|ASIA)[0-9A-Z]{16}\\\\b
- **AWS Secret Access Key**: \\\\b[0-9A-Za-z/+]{40}\\\\b
- **Generic Bearer/API token**: \\\\b(?:Bearer\\\\s+)?[A-Za-z0-9-_]{20,}\\\\b
- **URL cu token param**: https?://[^\\\\s]+[?&](?:token|key|secret)=[^\\\\s&]+
- **Snowflake JWT-ish**: \\\\beyJ[a-zA-Z0-9_-]{10,}\\\\.eyJ[a-zA-Z0-9_-]{10,}\\\\.[a-zA-Z0-9_-]{10,}\\\\b

**Recomandare**: Combinați regex cu **măsurarea entropiei** și liste de prefixe cunoscute pentru a reduce fals‑pozitivele. Nu stocați rezultate brute; consolidați și **rotați imediat** orice secret identificat.

### 

### 9) Întărirea proceselor de suport (people & process)

- **Politică „fără secrete în ticket”** + canal separat, temporar, securizat pentru trimiterea credențialelor.
- **Vault** (ex. HashiCorp Vault, 1Password Business) cu **TTL scurt** și **one‑time links** pentru partajare.
- **Runbooks** pentru echipele de suport: cum să recunoască secrete în text și cum să le redacteze.
- **Educație clienți**: template‑uri de răspuns care descurajează includerea de chei în câmpurile libere; alternative sigure explicate pas cu pas.

### 

### 10) Întrebări frecvente (FAQ)

**Î: A fost compromis Salesforce însuși?**

**R:** Nu. A fost compromisă **o integrare terță** (Salesloft Drift) ale cărei tokenuri au permis accesul la unele instanțe Salesforce.

**Î: Cloudflare a pierdut atașamente sau doar text?**

**R:** **Doar textul câmpurilor din Case**; **atașamentele nu au fost exfiltrate**.

**Î: Ce a făcut Cloudflare cu tokenurile găsite?**

**R:** A **rotit 104 tokenuri API** și a **monitorizat** pentru abuz – **fără** indicii de utilizare malițioasă.

**Î: Am partajat un token într‑un ticket la Cloudflare. Ce fac?**

**R:** **Rotați acum** acel token; verificați și alte credențiale similare partajate în istorieți scriind aici...

###### Partajați această postare

<p>
                [<i class="fa fa-facebook-square" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-twitter" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-linkedin" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
            </p>

###### Etichete

###### Arhivează

<p>
            </p>
        ", "en_US": "

<blockquote>**TL;DR**: În august 2025, un atac de tip supply‑chain asupra aplicației **Salesloft Drift** a permis unui actor avansat (clasificat de Cloudflare ca **GRUB1**) să folosească **tokenuri OAuth** pentru a accesa instanțe **Salesforce** ale sute de organizații. În cazul **Cloudflare**, expunerea s‑a limitat la **câmpurile text** din **Salesforce Case** (tichete de suport) – **fără atașamente**. Au fost identificate **104 tokenuri API Cloudflare** în textul cazurilor; toate au fost **rotite** și **nu s‑a observat activitate malițioasă**
 asociată. Cloudflare a deconectat integrarea compromisă, a 
revocat/rotit credențiale pe scară largă, a notificat clienții și a 
publicat IOCs și cronologia.</blockquote>

## 

## 1) Context & de ce contează

Integrarea instrumentelor SaaS în CRM‑uri precum Salesforce este standardul industriei. **Drift** (prin **Salesloft**) oferă funcții de chat/lead‑gen și e conectat frecvent la Salesforce prin **OAuth**. În **august 2025**, o campanie coordonată a compromis aceste integrări, permițând **autentificarea la API‑urile Salesforce cu tokenuri OAuth valide**. Nu a fost un exploit „0‑day” în Salesforce, ci **abuz de integrare terță**.

**Ce s‑a furat?** La scară largă: textul unor obiecte Salesforce (în special **Case**), inclusiv **correspondența de suport** unde clienții, uneori, copiază **loguri, tokenuri, parole**.

**Ce NU s‑a furat în cazul Cloudflare?** Conform investigației Cloudflare, **nu au fost exfiltrate atașamente** ale cazurilor – doar **câmpurile text**.

### 2) Cum a funcționat atacul (pe scurt tehnic)

- **Sustragere tokenuri OAuth (și, în unele cazuri, refresh tokens)** asociate aplicației Drift/Salesloft.
- **Autentificare** la API‑urile Salesforce ale victimelor, folosind **scopes** acordate aplicației.
- **Recunoaștere**: interogări către /services/data/v58.0/sobjects/ pentru listare obiecte, .../Case/describe/ pentru schemă.
- **Exfiltrare**: utilizarea **Bulk API 2.0** pentru export rapid (ex. textul din **Case**), urmată de **ștergerea jobului** pentru a reduce urmele.
- **Persistență evitată**: atacatorul a mizat pe **re‑utilizarea tokenurilor** și pe fereastra scurtă înainte de **revocările masive** operate de furnizor.

### 3) Impactul asupra Cloudflare – fapte cheie

- **Fereastra atacului**: recon la **9 aug 2025**, acces și exfiltrare între **12–17 aug 2025**.
- **Suprafață**: **doar câmpuri text** din obiectul **Case** (tichete de suport); **fără atașamente**.
- **Date potențial sensibile** în text: contacte clienți, subiecte, conținut conversații; în unele cazuri, clienții au inclus **tokenuri/parole/loguri** în mesajele de suport.
- **104 tokenuri API Cloudflare identificate** în corpusul exfiltrat → **rotite** „din abundență de prudență”; **nu** s‑a observat activitate suspectă asociată.
- **Nicio compromitere** a serviciilor/infrastructurii Cloudflare.
- **Clienți notificați** direct + banner în Dashboard; recomandare: **rotați orice credențiale** partajate prin tichete de suport.

### 4) Cronologie detaliată (UTC)

<blockquote>
Fragment din reconstrucția forensică a activităților actorului urmărit de Cloudflare ca **GRUB1**
</blockquote>

- **2025‑08‑09 11:51:13** – Recon: User‑Agent **TruffleHog** încearcă verificarea unui token către endpointul Cloudflare client/v4/user/tokens/verify → **404** (invalid). IP: **44[.]215[.]108[.]109** (AWS).
- **2025‑08‑12 22:14:08/09** – Login în tenantul Salesforce Cloudflare; **GET** .../v58.0/sobjects/ (enumerare obiecte). IP: **44[.]215[.]108[.]109**.
- **2025‑08‑13 19:33:02–11** – Relogin + **describe** pe Case și **interogare largă** pe obiectul **Case**.
- **2025‑08‑14 00:17–11:09** – Recon avansat: **COUNT()** pe Account, Contact, User; analiză pe CaseTeamMemberHistory__c; fingerprint Organization (verificare producție vs sandbox); **GET /limits/** (capabilități/rate‑limits).
- **2025‑08‑16 19:26–19:28** – „**Dry‑run**”: **SELECT COUNT() FROM Case**.
- **2025‑08‑17 11:11:23–11:15:42** – Trecere pe altă infrastructură (IP: **208[.]68[.]36[.]90**, DigitalOcean), **Bulk API 2.0 job** pentru exportul **Case** (text), apoi **ștergere job**.
- **2025‑08‑20** – Revocări Drift → Salesforce la nivel de furnizor.
- **2025‑08‑23** – Salesforce & Salesloft notifică Cloudflare; începe răspunsul oficial.
- **2025‑08‑25** – Cloudflare extinde răspunsul: dezactivare cont Drift, revocare client ID/secrete, **dezinstalare totală** Salesloft (app + extensii browser), rotație integrări terțe în jurul Salesforce, **scanare proprie** pentru găsirea secretelor în corpus.
- **2025‑08‑26–29** – Re‑onboarding controlat al integrărilor, **rotație proactivă**; **104 tokenuri Cloudflare** detectate & rotite; **fără activitate suspectă** asociată.
- **2025‑09‑02** – Notificări finale către toți clienții afectați; publicarea rezultatelor și a IOCs.

### 5) Indicatori de compromis (IOCs)

- **IP**: 44[.]215[.]108[.]109 (AWS)
- **IP**: 208[.]68[.]36[.]90 (DigitalOcean)
- **User‑Agents** observate:
<li>TruffleHog (scanner secretes)
- Salesforce-Multi-Org-Fetcher/1.0 (tooling malițios)
- Salesforce-CLI/1.0
- python-requests/2.32.4
- Python/3.11 aiohttp/3.12.15
</li>

<blockquote>
**Notă**: lista UA nu e exhaustivă; multe tool‑uri își pot falsifica User‑Agent‑ul.
</blockquote>

### 

### 6) Ce ar trebui să facă **clienții Cloudflare** acum

- **Rotați toate credențialele** pe care le‑ați introdus vreodată în tichetele de suport Cloudflare (API tokens, chei, parole, webhook secrets etc.).
- **Revizuiți istoricul tichetelor**: Cloudflare Dashboard → **Support → Technical Support → My Activities** → filtrați/folosiți **„Download Cases”** pentru o analiză completă.
- **Verificați accesul** la conturile Cloudflare (audit tokens, IP allowlist, 2FA/SSO, loguri de acces).<li>**Ajustați procesele** interne: nu mai includeți **secrete**
 în texte de suport; folosiți canale securizate pentru partajarea 
temporară a credentialelor (ex. linkuri one‑time, Vault, 
DLP/secret‑sharing cu TTL scurt).</li>

### 

### 7) Playbook de răspuns (Salesforce + integrații SaaS)

#### 

#### 7.1 Containment imediat

- **Dezactivați/ștergeți** integrarea **Salesloft Drift** și **revocați** toate tokenurile/refresh tokens asociate.
- **Revocați sesiunile** pentru utilizatorii aplicației conectate (Connected App) și **resetați secretele** Connected App (Consumer Key/Secret).
- **Opriți temporar** celelalte integrări cu privilegii similare; re‑onboard controlat, cu **chei noi** și **scopuri minime** (least privilege).<li>**Blocați pe IP**
 (dacă e posibil) accesul API pentru intervalele observate (AWS 
44.215.108.109, DigitalOcean 208.68.36.90) până finalizați ancheta.</li>

#### 7.2 Eradicare & hardening

- **Rotație săptămânală** pentru secretele aplicațiilor terțe (model adoptat de Cloudflare post‑incident).
- **IP Allowlisting / Session Binding** pentru Connected Apps critice (legați sesiunile de IP‑uri așteptate/VPN‑uri).
- **Scopes minime & profil dedicat**: creați un **user tehnic** doar cu permisiunile strict necesare; eliminați „API Enabled” unde nu e absolut necesar.
- **DLP/Redaction** pe câmpuri de **Case**: detectați și mascați **tokenuri, parole, chei** în timp real (regex + entropie).
- **Rate‑limits & alerte** pentru **Bulk API Jobs** (creare, volum, ștergere rapidă a joburilor).

#### 7.3 Forensics & detecție (Salesforce Event Monitoring / SIEM)

Căutați:

- **Login‑uri API** de pe IP‑urile IOCs în fereastra 9–20 aug 2025.
- **User‑Agent‑uri** din lista de mai sus.
- Accese către rutele:
<li>GET /services/data/v58.0/sobjects/
- GET /services/data/v58.0/sobjects/Case/describe/
- GET /services/data/v58.0/limits/
- **SOQL** cu SELECT COUNT() FROM Case
- Evenimente **Bulk API 2.0** (creare job → exfiltrare → **delete job** la scurt timp)
</li>

<blockquote><p>**Sugestii de câmpuri (Event Monitoring)**: 
LoginEvent, ApiEvent, BulkApiResult, ConnectedAppOAuthUsage, Uri, 
ClientIp, UserAgent, RequestStatus, RowsProcessed, QueryText.</p></blockquote>

### 

### 8) Ghid: căutarea secretelor în textul **Case** (defensiv)

<blockquote>
Dacă aveți exporturi vechi sau backupuri ale câmpurilor text, rulați o scanare defensivă.
</blockquote>

Exemple **regex** utile (defensive patterns):

- **AWS Access Key ID**: \\\\b(A3T|AKIA|ASIA)[0-9A-Z]{16}\\\\b
- **AWS Secret Access Key**: \\\\b[0-9A-Za-z/+]{40}\\\\b
- **Generic Bearer/API token**: \\\\b(?:Bearer\\\\s+)?[A-Za-z0-9-_]{20,}\\\\b
- **URL cu token param**: https?://[^\\\\s]+[?&](?:token|key|secret)=[^\\\\s&]+
- **Snowflake JWT-ish**: \\\\beyJ[a-zA-Z0-9_-]{10,}\\\\.eyJ[a-zA-Z0-9_-]{10,}\\\\.[a-zA-Z0-9_-]{10,}\\\\b

**Recomandare**: Combinați regex cu **măsurarea entropiei** și liste de prefixe cunoscute pentru a reduce fals‑pozitivele. Nu stocați rezultate brute; consolidați și **rotați imediat** orice secret identificat.

### 

### 9) Întărirea proceselor de suport (people & process)

- **Politică „fără secrete în ticket”** + canal separat, temporar, securizat pentru trimiterea credențialelor.
- **Vault** (ex. HashiCorp Vault, 1Password Business) cu **TTL scurt** și **one‑time links** pentru partajare.
- **Runbooks** pentru echipele de suport: cum să recunoască secrete în text și cum să le redacteze.
- **Educație clienți**: template‑uri de răspuns care descurajează includerea de chei în câmpurile libere; alternative sigure explicate pas cu pas.

### 

### 10) Întrebări frecvente (FAQ)

**Î: A fost compromis Salesforce însuși?**

**R:** Nu. A fost compromisă **o integrare terță** (Salesloft Drift) ale cărei tokenuri au permis accesul la unele instanțe Salesforce.

**Î: Cloudflare a pierdut atașamente sau doar text?**

**R:** **Doar textul câmpurilor din Case**; **atașamentele nu au fost exfiltrate**.

**Î: Ce a făcut Cloudflare cu tokenurile găsite?**

**R:** A **rotit 104 tokenuri API** și a **monitorizat** pentru abuz – **fără** indicii de utilizare malițioasă.

**Î: Am partajat un token într‑un ticket la Cloudflare. Ce fac?**

**R:** **Rotați acum** acel token; verificați și alte credențiale similare partajate în istorieți scriind aici...

###### Partajați această postare

<p>
                [<i class="fa fa-facebook-square" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-twitter" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-linkedin" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
            </p>

###### Etichete

###### Arhivează

<p>
            </p>
        ", "ro_RO": "

<blockquote>**TL;DR**: În august 2025, un atac de tip supply‑chain asupra aplicației **Salesloft Drift** a permis unui actor avansat (clasificat de Cloudflare ca **GRUB1**) să folosească **tokenuri OAuth** pentru a accesa instanțe **Salesforce** ale sute de organizații. În cazul **Cloudflare**, expunerea s‑a limitat la **câmpurile text** din **Salesforce Case** (tichete de suport) – **fără atașamente**. Au fost identificate **104 tokenuri API Cloudflare** în textul cazurilor; toate au fost **rotite** și **nu s‑a observat activitate malițioasă**
 asociată. Cloudflare a deconectat integrarea compromisă, a 
revocat/rotit credențiale pe scară largă, a notificat clienții și a 
publicat IOCs și cronologia.</blockquote>

## 

## 1) Context & de ce contează

Integrarea instrumentelor SaaS în CRM‑uri precum Salesforce este standardul industriei. **Drift** (prin **Salesloft**) oferă funcții de chat/lead‑gen și e conectat frecvent la Salesforce prin **OAuth**. În **august 2025**, o campanie coordonată a compromis aceste integrări, permițând **autentificarea la API‑urile Salesforce cu tokenuri OAuth valide**. Nu a fost un exploit „0‑day” în Salesforce, ci **abuz de integrare terță**.

**Ce s‑a furat?** La scară largă: textul unor obiecte Salesforce (în special **Case**), inclusiv **correspondența de suport** unde clienții, uneori, copiază **loguri, tokenuri, parole**.

**Ce NU s‑a furat în cazul Cloudflare?** Conform investigației Cloudflare, **nu au fost exfiltrate atașamente** ale cazurilor – doar **câmpurile text**.

### 2) Cum a funcționat atacul (pe scurt tehnic)

- **Sustragere tokenuri OAuth (și, în unele cazuri, refresh tokens)** asociate aplicației Drift/Salesloft.
- **Autentificare** la API‑urile Salesforce ale victimelor, folosind **scopes** acordate aplicației.
- **Recunoaștere**: interogări către /services/data/v58.0/sobjects/ pentru listare obiecte, .../Case/describe/ pentru schemă.
- **Exfiltrare**: utilizarea **Bulk API 2.0** pentru export rapid (ex. textul din **Case**), urmată de **ștergerea jobului** pentru a reduce urmele.
- **Persistență evitată**: atacatorul a mizat pe **re‑utilizarea tokenurilor** și pe fereastra scurtă înainte de **revocările masive** operate de furnizor.

### 3) Impactul asupra Cloudflare – fapte cheie

- **Fereastra atacului**: recon la **9 aug 2025**, acces și exfiltrare între **12–17 aug 2025**.
- **Suprafață**: **doar câmpuri text** din obiectul **Case** (tichete de suport); **fără atașamente**.
- **Date potențial sensibile** în text: contacte clienți, subiecte, conținut conversații; în unele cazuri, clienții au inclus **tokenuri/parole/loguri** în mesajele de suport.
- **104 tokenuri API Cloudflare identificate** în corpusul exfiltrat → **rotite** „din abundență de prudență”; **nu** s‑a observat activitate suspectă asociată.
- **Nicio compromitere** a serviciilor/infrastructurii Cloudflare.
- **Clienți notificați** direct + banner în Dashboard; recomandare: **rotați orice credențiale** partajate prin tichete de suport.

### 4) Cronologie detaliată (UTC)

<blockquote>
Fragment din reconstrucția forensică a activităților actorului urmărit de Cloudflare ca **GRUB1**
</blockquote>

- **2025‑08‑09 11:51:13** – Recon: User‑Agent **TruffleHog** încearcă verificarea unui token către endpointul Cloudflare client/v4/user/tokens/verify → **404** (invalid). IP: **44[.]215[.]108[.]109** (AWS).
- **2025‑08‑12 22:14:08/09** – Login în tenantul Salesforce Cloudflare; **GET** .../v58.0/sobjects/ (enumerare obiecte). IP: **44[.]215[.]108[.]109**.
- **2025‑08‑13 19:33:02–11** – Relogin + **describe** pe Case și **interogare largă** pe obiectul **Case**.
- **2025‑08‑14 00:17–11:09** – Recon avansat: **COUNT()** pe Account, Contact, User; analiză pe CaseTeamMemberHistory__c; fingerprint Organization (verificare producție vs sandbox); **GET /limits/** (capabilități/rate‑limits).
- **2025‑08‑16 19:26–19:28** – „**Dry‑run**”: **SELECT COUNT() FROM Case**.
- **2025‑08‑17 11:11:23–11:15:42** – Trecere pe altă infrastructură (IP: **208[.]68[.]36[.]90**, DigitalOcean), **Bulk API 2.0 job** pentru exportul **Case** (text), apoi **ștergere job**.
- **2025‑08‑20** – Revocări Drift → Salesforce la nivel de furnizor.
- **2025‑08‑23** – Salesforce & Salesloft notifică Cloudflare; începe răspunsul oficial.
- **2025‑08‑25** – Cloudflare extinde răspunsul: dezactivare cont Drift, revocare client ID/secrete, **dezinstalare totală** Salesloft (app + extensii browser), rotație integrări terțe în jurul Salesforce, **scanare proprie** pentru găsirea secretelor în corpus.
- **2025‑08‑26–29** – Re‑onboarding controlat al integrărilor, **rotație proactivă**; **104 tokenuri Cloudflare** detectate & rotite; **fără activitate suspectă** asociată.
- **2025‑09‑02** – Notificări finale către toți clienții afectați; publicarea rezultatelor și a IOCs.

### 5) Indicatori de compromis (IOCs)

- **IP**: 44[.]215[.]108[.]109 (AWS)
- **IP**: 208[.]68[.]36[.]90 (DigitalOcean)
- **User‑Agents** observate:
<li>TruffleHog (scanner secretes)
- Salesforce-Multi-Org-Fetcher/1.0 (tooling malițios)
- Salesforce-CLI/1.0
- python-requests/2.32.4
- Python/3.11 aiohttp/3.12.15
</li>

<blockquote>
**Notă**: lista UA nu e exhaustivă; multe tool‑uri își pot falsifica User‑Agent‑ul.
</blockquote>

### 

### 6) Ce ar trebui să facă **clienții Cloudflare** acum

- **Rotați toate credențialele** pe care le‑ați introdus vreodată în tichetele de suport Cloudflare (API tokens, chei, parole, webhook secrets etc.).
- **Revizuiți istoricul tichetelor**: Cloudflare Dashboard → **Support → Technical Support → My Activities** → filtrați/folosiți **„Download Cases”** pentru o analiză completă.
- **Verificați accesul** la conturile Cloudflare (audit tokens, IP allowlist, 2FA/SSO, loguri de acces).<li>**Ajustați procesele** interne: nu mai includeți **secrete**
 în texte de suport; folosiți canale securizate pentru partajarea 
temporară a credentialelor (ex. linkuri one‑time, Vault, 
DLP/secret‑sharing cu TTL scurt).</li>

### 

### 7) Playbook de răspuns (Salesforce + integrații SaaS)

#### 

#### 7.1 Containment imediat

- **Dezactivați/ștergeți** integrarea **Salesloft Drift** și **revocați** toate tokenurile/refresh tokens asociate.
- **Revocați sesiunile** pentru utilizatorii aplicației conectate (Connected App) și **resetați secretele** Connected App (Consumer Key/Secret).
- **Opriți temporar** celelalte integrări cu privilegii similare; re‑onboard controlat, cu **chei noi** și **scopuri minime** (least privilege).<li>**Blocați pe IP**
 (dacă e posibil) accesul API pentru intervalele observate (AWS 
44.215.108.109, DigitalOcean 208.68.36.90) până finalizați ancheta.</li>

#### 7.2 Eradicare & hardening

- **Rotație săptămânală** pentru secretele aplicațiilor terțe (model adoptat de Cloudflare post‑incident).
- **IP Allowlisting / Session Binding** pentru Connected Apps critice (legați sesiunile de IP‑uri așteptate/VPN‑uri).
- **Scopes minime & profil dedicat**: creați un **user tehnic** doar cu permisiunile strict necesare; eliminați „API Enabled” unde nu e absolut necesar.
- **DLP/Redaction** pe câmpuri de **Case**: detectați și mascați **tokenuri, parole, chei** în timp real (regex + entropie).
- **Rate‑limits & alerte** pentru **Bulk API Jobs** (creare, volum, ștergere rapidă a joburilor).

#### 7.3 Forensics & detecție (Salesforce Event Monitoring / SIEM)

Căutați:

- **Login‑uri API** de pe IP‑urile IOCs în fereastra 9–20 aug 2025.
- **User‑Agent‑uri** din lista de mai sus.
- Accese către rutele:
<li>GET /services/data/v58.0/sobjects/
- GET /services/data/v58.0/sobjects/Case/describe/
- GET /services/data/v58.0/limits/
- **SOQL** cu SELECT COUNT() FROM Case
- Evenimente **Bulk API 2.0** (creare job → exfiltrare → **delete job** la scurt timp)
</li>

<blockquote><p>**Sugestii de câmpuri (Event Monitoring)**: 
LoginEvent, ApiEvent, BulkApiResult, ConnectedAppOAuthUsage, Uri, 
ClientIp, UserAgent, RequestStatus, RowsProcessed, QueryText.</p></blockquote>

### 

### 8) Ghid: căutarea secretelor în textul **Case** (defensiv)

<blockquote>
Dacă aveți exporturi vechi sau backupuri ale câmpurilor text, rulați o scanare defensivă.
</blockquote>

Exemple **regex** utile (defensive patterns):

- **AWS Access Key ID**: \\\\b(A3T|AKIA|ASIA)[0-9A-Z]{16}\\\\b
- **AWS Secret Access Key**: \\\\b[0-9A-Za-z/+]{40}\\\\b
- **Generic Bearer/API token**: \\\\b(?:Bearer\\\\s+)?[A-Za-z0-9-_]{20,}\\\\b
- **URL cu token param**: https?://[^\\\\s]+[?&](?:token|key|secret)=[^\\\\s&]+
- **Snowflake JWT-ish**: \\\\beyJ[a-zA-Z0-9_-]{10,}\\\\.eyJ[a-zA-Z0-9_-]{10,}\\\\.[a-zA-Z0-9_-]{10,}\\\\b

**Recomandare**: Combinați regex cu **măsurarea entropiei** și liste de prefixe cunoscute pentru a reduce fals‑pozitivele. Nu stocați rezultate brute; consolidați și **rotați imediat** orice secret identificat.

### 

### 9) Întărirea proceselor de suport (people & process)

- **Politică „fără secrete în ticket”** + canal separat, temporar, securizat pentru trimiterea credențialelor.
- **Vault** (ex. HashiCorp Vault, 1Password Business) cu **TTL scurt** și **one‑time links** pentru partajare.
- **Runbooks** pentru echipele de suport: cum să recunoască secrete în text și cum să le redacteze.
- **Educație clienți**: template‑uri de răspuns care descurajează includerea de chei în câmpurile libere; alternative sigure explicate pas cu pas.

### 

### 10) Întrebări frecvente (FAQ)

**Î: A fost compromis Salesforce însuși?**

**R:** Nu. A fost compromisă **o integrare terță** (Salesloft Drift) ale cărei tokenuri au permis accesul la unele instanțe Salesforce.

**Î: Cloudflare a pierdut atașamente sau doar text?**

**R:** **Doar textul câmpurilor din Case**; **atașamentele nu au fost exfiltrate**.

**Î: Ce a făcut Cloudflare cu tokenurile găsite?**

**R:** A **rotit 104 tokenuri API** și a **monitorizat** pentru abuz – **fără** indicii de utilizare malițioasă.

**Î: Am partajat un token într‑un ticket la Cloudflare. Ce fac?**

**R:** **Rotați acum** acel token; verificați și alte credențiale similare partajate în istorieți scriind aici...

###### Partajați această postare

<p>
                [<i class="fa fa-facebook-square" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-twitter" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
                [<i class="fa fa-linkedin" contenteditable="false"></i>](https://www.zebrabyte.ro/blog/blogul-nostru-1/bresa-salesloft-drift-salesforce-impactul-asupra-cloudflare-cronologie-completa-si-ghid-de-raspuns-17#)
            </p>

###### Etichete

###### Arhivează

<p>
            </p>
        "}
