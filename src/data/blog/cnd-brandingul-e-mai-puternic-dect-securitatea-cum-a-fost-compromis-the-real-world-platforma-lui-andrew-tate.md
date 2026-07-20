---
title: "Când brandingul e mai puternic decât securitatea: Cum a fost compromisă „The Real World” – platforma lui Andrew Tate"
description: "O analiză detaliată a atacului cibernetic asupra platformei „The Real World” a lui Andrew Tate. Află cum a fost compromisă și ce date au fost expuse."
pubDate: 2025-04-08
category: "cybersecurity"
draft: false
---

{"en_GB": "

### Introducere

Andrew Tate, fost campion de kickboxing devenit influencer online și controversat om de afaceri, a creat platforma educațională „The Real World” (TRW) ca un ecosistem închis pentru „antrenamentul financiar, mental și digital” al tinerilor dornici de independență financiară. Promovată ca o alternativă la sistemul clasic de educație, TRW s-a dezvoltat rapid, atrăgând peste 100.000 de abonați din întreaga lume, inclusiv din România. În spatele acestei promisiuni însă, se afla o platformă construită pe un cod vulnerabil și menținută fără responsabilitate.

În noiembrie 2024, această realitate a ieșit la iveală: un atac cibernetic masiv a expus aproape 800.000 de conturi de utilizatori, împreună cu conversații private, adrese de email și fișiere partajate în cadrul platformei. Acest articol documentează pas cu pas compromiterea platformei, cum au fost exploatate vulnerabilitățile, ce date au fost afectate și, mai ales, ce învățăminte putem extrage din această breșă care a trecut aproape neobservată în România.

### 1. Contextul atacului

Atacul a avut loc pe 21 noiembrie 2024, într-un moment extrem de ironic: chiar în timp ce Andrew Tate transmitea live un episod din podcastul său „Emergency Meeting”. Hackerii au preluat controlul asupra serverului TRW și au inundat canalele de discuții cu imagini și emoji-uri pro-LGBTQ și mesaje ironice la adresa fondatorului. Acțiunea nu a fost doar tehnică, ci și simbolică, cu un scop clar: ridiculizarea narativului promovat de platformă.

Grupul de hackeri care a revendicat atacul a declarat că acțiunea a fost un act de „hacktivism”, motivat ideologic, împotriva discursului promovat de Tate. După atacul demonstrativ, datele extrase au fost trimise către organizația jurnalistică DDoSecrets și adăugate în baza de date Have I Been Pwned pentru ca utilizatorii să poată verifica dacă au fost afectați.

### 2. Tehnologia din spate și vulnerabilitățile critice

Platforma TRW a fost construită pe **Revolt**, un software open-source similar cu Discord, destinat găzduirii comunităților și interacțiunii prin chat-uri, canale audio și partajare de fișiere. Problema? Codul era o versiune veche, neactualizată, iar modificările aduse nu au respectat licența AGPL.

Mai mult decât atât, echipa tehnică nu a publicat codul sursă, așa cum era obligatoriu prin licența folosită, și nu a aplicat patch-urile de securitate lansate de dezvoltatorul original. De asemenea, existau:

<li>
Configurări incorecte în baza de date MongoDB
</li>
<li>
Lipsa criptării datelor în repaus (at rest)
</li>
<li>
Lipsa unui sistem RBAC (Role-Based Access Control) funcțional
</li>
<li>
Lipsa criptării end-to-end a mesajelor private
</li>

### 3. Exploatarea și compromiterea platformei

Prin manipularea codului client din browser, hackerii au putut obține privilegii administrative. Practic, modificând o variabilă JavaScript, se puteau „declara” administratori ai platformei. Serverul nu valida aceste privilegii, iar sistemul accepta comenzile fără verificare de autorizație. De aici, totul a fost posibil:

<li>
Ștergerea de fișiere
</li>
<li>
Afișarea de conținut vizual ofensator în chat
</li>
<li>
Descărcarea tuturor canalelor de comunicare (publice și private)
</li>
<li>
Exfiltrarea fișierelor media, inclusiv imagini, PDF-uri, videoclipuri
</li>

Estimările arată că peste **14 GB de date** au fost extrase în doar câteva ore. Lipsa unui sistem de alertare în caz de activitate anormală a însemnat că atacatorii au acționat nestingheriți până când au dorit să se facă vizibili.

### 4. Ce date au fost expuse?

Breșa a inclus:

<li>
Peste **794.000 de conturi de utilizator** compromise
</li>
<li>
Cel puțin **324.000 de adrese de email** unice
</li>
<li>
Peste **22 milioane de mesaje** (chat-uri publice și private)
</li>
<li>
Fișiere media încărcate de utilizatori
</li>

Nicio criptare nu proteja mesajele sau fișierele partajate. Deși nu s-au raportat scurgeri de informații financiare (TRW folosea procesatori terți), este posibil ca parolele, chiar dacă hash-uite, să fi fost de asemenea compromise. Lipsa unui anunț oficial înseamnă că nimeni nu poate spune cu certitudine cât de gravă este compromiterea totală.

### 5. Reacția oficială (sau lipsa acesteia)

După atac, nici Andrew Tate și nici echipa sa nu au emis un comunicat oficial. Nu s-au trimis notificări către utilizatori. Platforma nu a fost închisă temporar pentru verificări și nu au fost oferite explicații tehnice sau scuze publice. Tăcerea completă a fost abordarea aleasă.

Această lipsă de transparență este o abatere gravă de la standardele de bune practici în cazul breșelor de securitate. În UE, o astfel de scurgere ar fi trebuit notificată autorităților în termen de 72 de ore conform GDPR. Faptul că platforma a ignorat acest aspect poate atrage consecințe legale, pe lângă cele reputaționale.

### 6. Lecții învățate

Această breșă nu este doar despre un server compromis. Este o lecție despre ignoranță, aroganță și lipsa de profesionalism digital.

<li>
**Respectarea licenței open-source** nu este opțională.
</li>
<li>
**Update-urile regulate și auditul de cod** sunt obligatorii.
</li>
<li>
**Criptarea datelor** și a mesajelor trebuie să fie standard, nu excepție.
</li>
<li>
**Transparența post-incident** este un semn de respect față de utilizatori.
</li>
<li>
**Datele personale trebuie minimizate** și protejate prin criptare la rest și în tranzit.
</li>
<li>
**Sistemele de alertă și logare a activităților** sunt vitale pentru detectarea timpurie.
</li>

### Concluzie

„The Real World” se prezenta ca o comunitate digitală exclusivistă, dedicată dezvoltării personale. Dar în spatele ușilor închise, platforma era un colaj de cod vechi, securitate neglijată și lipsă de respect față de utilizatori. Imaginea de invincibilitate promovată de Andrew Tate a fost spartă nu de media, ci de o simplă analiză de cod și câteva comenzi în consola browserului.

Această breșă este un avertisment clar: oricât de puternic este brandingul, **securitatea nu se poate fenta**. În era digitală, arhitectura internă a unui produs este mai importantă decât reclamele sau personalitatea fondatorului.

###### **Dacă vrei să afli dacă emailul tău a fost expus în această breșă, verifică pe:** [**<font style="color: rgb(255, 0, 0);">h</font>**<font style="color: rgb(255, 0, 0);"></font><font style="color: rgb(255, 0, 0);"></font>](https://haveibeenpwned.com)[**<font style="color: rgb(255, 0, 0);">ttps://haveibeenpwned.com</font>**](https://haveibeenpwned.com)

**Distribuie acest articol pe TikTok, LinkedIn sau Instagram și ajută-ne să educăm publicul despre importanța reală a securității digitale.**
", "en_US": "

### Introducere

Andrew Tate, fost campion de kickboxing devenit influencer online și controversat om de afaceri, a creat platforma educațională „The Real World” (TRW) ca un ecosistem închis pentru „antrenamentul financiar, mental și digital” al tinerilor dornici de independență financiară. Promovată ca o alternativă la sistemul clasic de educație, TRW s-a dezvoltat rapid, atrăgând peste 100.000 de abonați din întreaga lume, inclusiv din România. În spatele acestei promisiuni însă, se afla o platformă construită pe un cod vulnerabil și menținută fără responsabilitate.

În noiembrie 2024, această realitate a ieșit la iveală: un atac cibernetic masiv a expus aproape 800.000 de conturi de utilizatori, împreună cu conversații private, adrese de email și fișiere partajate în cadrul platformei. Acest articol documentează pas cu pas compromiterea platformei, cum au fost exploatate vulnerabilitățile, ce date au fost afectate și, mai ales, ce învățăminte putem extrage din această breșă care a trecut aproape neobservată în România.

### 1. Contextul atacului

Atacul a avut loc pe 21 noiembrie 2024, într-un moment extrem de ironic: chiar în timp ce Andrew Tate transmitea live un episod din podcastul său „Emergency Meeting”. Hackerii au preluat controlul asupra serverului TRW și au inundat canalele de discuții cu imagini și emoji-uri pro-LGBTQ și mesaje ironice la adresa fondatorului. Acțiunea nu a fost doar tehnică, ci și simbolică, cu un scop clar: ridiculizarea narativului promovat de platformă.

Grupul de hackeri care a revendicat atacul a declarat că acțiunea a fost un act de „hacktivism”, motivat ideologic, împotriva discursului promovat de Tate. După atacul demonstrativ, datele extrase au fost trimise către organizația jurnalistică DDoSecrets și adăugate în baza de date Have I Been Pwned pentru ca utilizatorii să poată verifica dacă au fost afectați.

### 2. Tehnologia din spate și vulnerabilitățile critice

Platforma TRW a fost construită pe **Revolt**, un software open-source similar cu Discord, destinat găzduirii comunităților și interacțiunii prin chat-uri, canale audio și partajare de fișiere. Problema? Codul era o versiune veche, neactualizată, iar modificările aduse nu au respectat licența AGPL.

Mai mult decât atât, echipa tehnică nu a publicat codul sursă, așa cum era obligatoriu prin licența folosită, și nu a aplicat patch-urile de securitate lansate de dezvoltatorul original. De asemenea, existau:

<li>
Configurări incorecte în baza de date MongoDB
</li>
<li>
Lipsa criptării datelor în repaus (at rest)
</li>
<li>
Lipsa unui sistem RBAC (Role-Based Access Control) funcțional
</li>
<li>
Lipsa criptării end-to-end a mesajelor private
</li>

### 3. Exploatarea și compromiterea platformei

Prin manipularea codului client din browser, hackerii au putut obține privilegii administrative. Practic, modificând o variabilă JavaScript, se puteau „declara” administratori ai platformei. Serverul nu valida aceste privilegii, iar sistemul accepta comenzile fără verificare de autorizație. De aici, totul a fost posibil:

<li>
Ștergerea de fișiere
</li>
<li>
Afișarea de conținut vizual ofensator în chat
</li>
<li>
Descărcarea tuturor canalelor de comunicare (publice și private)
</li>
<li>
Exfiltrarea fișierelor media, inclusiv imagini, PDF-uri, videoclipuri
</li>

Estimările arată că peste **14 GB de date** au fost extrase în doar câteva ore. Lipsa unui sistem de alertare în caz de activitate anormală a însemnat că atacatorii au acționat nestingheriți până când au dorit să se facă vizibili.

### 4. Ce date au fost expuse?

Breșa a inclus:

<li>
Peste **794.000 de conturi de utilizator** compromise
</li>
<li>
Cel puțin **324.000 de adrese de email** unice
</li>
<li>
Peste **22 milioane de mesaje** (chat-uri publice și private)
</li>
<li>
Fișiere media încărcate de utilizatori
</li>

Nicio criptare nu proteja mesajele sau fișierele partajate. Deși nu s-au raportat scurgeri de informații financiare (TRW folosea procesatori terți), este posibil ca parolele, chiar dacă hash-uite, să fi fost de asemenea compromise. Lipsa unui anunț oficial înseamnă că nimeni nu poate spune cu certitudine cât de gravă este compromiterea totală.

### 5. Reacția oficială (sau lipsa acesteia)

După atac, nici Andrew Tate și nici echipa sa nu au emis un comunicat oficial. Nu s-au trimis notificări către utilizatori. Platforma nu a fost închisă temporar pentru verificări și nu au fost oferite explicații tehnice sau scuze publice. Tăcerea completă a fost abordarea aleasă.

Această lipsă de transparență este o abatere gravă de la standardele de bune practici în cazul breșelor de securitate. În UE, o astfel de scurgere ar fi trebuit notificată autorităților în termen de 72 de ore conform GDPR. Faptul că platforma a ignorat acest aspect poate atrage consecințe legale, pe lângă cele reputaționale.

### 6. Lecții învățate

Această breșă nu este doar despre un server compromis. Este o lecție despre ignoranță, aroganță și lipsa de profesionalism digital.

<li>
**Respectarea licenței open-source** nu este opțională.
</li>
<li>
**Update-urile regulate și auditul de cod** sunt obligatorii.
</li>
<li>
**Criptarea datelor** și a mesajelor trebuie să fie standard, nu excepție.
</li>
<li>
**Transparența post-incident** este un semn de respect față de utilizatori.
</li>
<li>
**Datele personale trebuie minimizate** și protejate prin criptare la rest și în tranzit.
</li>
<li>
**Sistemele de alertă și logare a activităților** sunt vitale pentru detectarea timpurie.
</li>

### Concluzie

„The Real World” se prezenta ca o comunitate digitală exclusivistă, dedicată dezvoltării personale. Dar în spatele ușilor închise, platforma era un colaj de cod vechi, securitate neglijată și lipsă de respect față de utilizatori. Imaginea de invincibilitate promovată de Andrew Tate a fost spartă nu de media, ci de o simplă analiză de cod și câteva comenzi în consola browserului.

Această breșă este un avertisment clar: oricât de puternic este brandingul, **securitatea nu se poate fenta**. În era digitală, arhitectura internă a unui produs este mai importantă decât reclamele sau personalitatea fondatorului.

###### **Dacă vrei să afli dacă emailul tău a fost expus în această breșă, verifică pe:** [**<font style="color: rgb(255, 0, 0);">h</font>**<font style="color: rgb(255, 0, 0);"></font>](https://haveibeenpwned.com)[**<font style="color: rgb(255, 0, 0);">ttps://haveibeenpwned.com</font>**](https://haveibeenpwned.com)

**Distribuie acest articol pe TikTok, LinkedIn sau Instagram și ajută-ne să educăm publicul despre importanța reală a securității digitale.**
", "ro_RO": "

### Introducere

Andrew Tate, fost campion de kickboxing devenit influencer online și controversat om de afaceri, a creat platforma educațională „The Real World” (TRW) ca un ecosistem închis pentru „antrenamentul financiar, mental și digital” al tinerilor dornici de independență financiară. Promovată ca o alternativă la sistemul clasic de educație, TRW s-a dezvoltat rapid, atrăgând peste 100.000 de abonați din întreaga lume, inclusiv din România. În spatele acestei promisiuni însă, se afla o platformă construită pe un cod vulnerabil și menținută fără responsabilitate.

În noiembrie 2024, această realitate a ieșit la iveală: un atac cibernetic masiv a expus aproape 800.000 de conturi de utilizatori, împreună cu conversații private, adrese de email și fișiere partajate în cadrul platformei. Acest articol documentează pas cu pas compromiterea platformei, cum au fost exploatate vulnerabilitățile, ce date au fost afectate și, mai ales, ce învățăminte putem extrage din această breșă care a trecut aproape neobservată în România.

### 1. Contextul atacului

Atacul a avut loc pe 21 noiembrie 2024, într-un moment extrem de ironic: chiar în timp ce Andrew Tate transmitea live un episod din podcastul său „Emergency Meeting”. Hackerii au preluat controlul asupra serverului TRW și au inundat canalele de discuții cu imagini și emoji-uri pro-LGBTQ și mesaje ironice la adresa fondatorului. Acțiunea nu a fost doar tehnică, ci și simbolică, cu un scop clar: ridiculizarea narativului promovat de platformă.

Grupul de hackeri care a revendicat atacul a declarat că acțiunea a fost un act de „hacktivism”, motivat ideologic, împotriva discursului promovat de Tate. După atacul demonstrativ, datele extrase au fost trimise către organizația jurnalistică DDoSecrets și adăugate în baza de date Have I Been Pwned pentru ca utilizatorii să poată verifica dacă au fost afectați.

### 2. Tehnologia din spate și vulnerabilitățile critice

Platforma TRW a fost construită pe **Revolt**, un software open-source similar cu Discord, destinat găzduirii comunităților și interacțiunii prin chat-uri, canale audio și partajare de fișiere. Problema? Codul era o versiune veche, neactualizată, iar modificările aduse nu au respectat licența AGPL.

Mai mult decât atât, echipa tehnică nu a publicat codul sursă, așa cum era obligatoriu prin licența folosită, și nu a aplicat patch-urile de securitate lansate de dezvoltatorul original. De asemenea, existau:

<li>
Configurări incorecte în baza de date MongoDB
</li>
<li>
Lipsa criptării datelor în repaus (at rest)
</li>
<li>
Lipsa unui sistem RBAC (Role-Based Access Control) funcțional
</li>
<li>
Lipsa criptării end-to-end a mesajelor private
</li>

### 3. Exploatarea și compromiterea platformei

Prin manipularea codului client din browser, hackerii au putut obține privilegii administrative. Practic, modificând o variabilă JavaScript, se puteau „declara” administratori ai platformei. Serverul nu valida aceste privilegii, iar sistemul accepta comenzile fără verificare de autorizație. De aici, totul a fost posibil:

<li>
Ștergerea de fișiere
</li>
<li>
Afișarea de conținut vizual ofensator în chat
</li>
<li>
Descărcarea tuturor canalelor de comunicare (publice și private)
</li>
<li>
Exfiltrarea fișierelor media, inclusiv imagini, PDF-uri, videoclipuri
</li>

Estimările arată că peste **14 GB de date** au fost extrase în doar câteva ore. Lipsa unui sistem de alertare în caz de activitate anormală a însemnat că atacatorii au acționat nestingheriți până când au dorit să se facă vizibili.

### 4. Ce date au fost expuse?

Breșa a inclus:

<li>
Peste **794.000 de conturi de utilizator** compromise
</li>
<li>
Cel puțin **324.000 de adrese de email** unice
</li>
<li>
Peste **22 milioane de mesaje** (chat-uri publice și private)
</li>
<li>
Fișiere media încărcate de utilizatori
</li>

Nicio criptare nu proteja mesajele sau fișierele partajate. Deși nu s-au raportat scurgeri de informații financiare (TRW folosea procesatori terți), este posibil ca parolele, chiar dacă hash-uite, să fi fost de asemenea compromise. Lipsa unui anunț oficial înseamnă că nimeni nu poate spune cu certitudine cât de gravă este compromiterea totală.

### 5. Reacția oficială (sau lipsa acesteia)

După atac, nici Andrew Tate și nici echipa sa nu au emis un comunicat oficial. Nu s-au trimis notificări către utilizatori. Platforma nu a fost închisă temporar pentru verificări și nu au fost oferite explicații tehnice sau scuze publice. Tăcerea completă a fost abordarea aleasă.

Această lipsă de transparență este o abatere gravă de la standardele de bune practici în cazul breșelor de securitate. În UE, o astfel de scurgere ar fi trebuit notificată autorităților în termen de 72 de ore conform GDPR. Faptul că platforma a ignorat acest aspect poate atrage consecințe legale, pe lângă cele reputaționale.

### 6. Lecții învățate

Această breșă nu este doar despre un server compromis. Este o lecție despre ignoranță, aroganță și lipsa de profesionalism digital.

<li>
**Respectarea licenței open-source** nu este opțională.
</li>
<li>
**Update-urile regulate și auditul de cod** sunt obligatorii.
</li>
<li>
**Criptarea datelor** și a mesajelor trebuie să fie standard, nu excepție.
</li>
<li>
**Transparența post-incident** este un semn de respect față de utilizatori.
</li>
<li>
**Datele personale trebuie minimizate** și protejate prin criptare la rest și în tranzit.
</li>
<li>
**Sistemele de alertă și logare a activităților** sunt vitale pentru detectarea timpurie.
</li>

### Concluzie

„The Real World” se prezenta ca o comunitate digitală exclusivistă, dedicată dezvoltării personale. Dar în spatele ușilor închise, platforma era un colaj de cod vechi, securitate neglijată și lipsă de respect față de utilizatori. Imaginea de invincibilitate promovată de Andrew Tate a fost spartă nu de media, ci de o simplă analiză de cod și câteva comenzi în consola browserului.

Această breșă este un avertisment clar: oricât de puternic este brandingul, **securitatea nu se poate fenta**. În era digitală, arhitectura internă a unui produs este mai importantă decât reclamele sau personalitatea fondatorului.

###### **Dacă vrei să afli dacă emailul tău a fost expus în această breșă, verifică pe:** [**<font style="color: rgb(255, 0, 0);">h</font>**<font style="color: rgb(255, 0, 0);"></font>](https://haveibeenpwned.com)[**<font style="color: rgb(255, 0, 0);">ttps://haveibeenpwned.com</font>**](https://haveibeenpwned.com)

**Distribuie acest articol pe TikTok, LinkedIn sau Instagram și ajută-ne să educăm publicul despre importanța reală a securității digitale.**
"}
