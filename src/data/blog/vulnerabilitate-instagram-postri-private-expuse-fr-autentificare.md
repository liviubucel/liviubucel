---
title: "Vulnerabilitate Instagram: postări private expuse fără autentificare"
description: "Expunerea postărilor private pe Instagram prin polaris_timeline_connection, 1. Introducere, 2. Contextul descoperirii, 3. Confirmarea vulnerabilității, 4. Descriere tehnică detaliată, 5. Proof of Concept (PoC), 6. Testare controlată, 7. Disclosure către Meta – cronologie, completă, 8. Starea „trigger” – indiciu critic, 9. Ce NU a făcut Meta, 10. Dovezi și integritate, 11. Impact real, 12. De ce acest disclosure este public, 13. Concluzie, Technical Details"
pubDate: 2026-02-01
category: "cybersecurity"
draft: false
---

{"en_GB": "

Start writing here...

        ", "en_US": "
### Expunerea postărilor private pe Instagram prin polaris_timeline_connection

##### 
Analiză tehnică completă a unei vulnerabilități server-side negate oficial

**Platformă afectată:** Instagram

**Deținut de:** Meta

**Perioada descoperirii:** Octombrie 2025

**Durata disclosure-ului:** 102 zile

**Tip vulnerabilitate:** Server-side authorization bypass

**Impact:** Acces neautorizat la conținut privat (imagini + descrieri)

**Status final:** Patch aplicat în tăcere, caz închis ca *Not Applicable*

### 1. Introducere

### 

Acest articol documentează **o vulnerabilitate reală, exploatabilă și demonstrată** din infrastructura Instagram (mobile web), care a permis **acces complet neautentificat** la postări aparținând unor conturi setate ca *private*.

Deși problema a fost **corectată în mod demonstrabil** la scurt timp după raportare, Meta a refuzat recunoașterea existenței ei, susținând că nu a fost niciodată reproductibilă.

Articolul de față nu este o opinie, ci o **reconstrucție tehnică și cronologică**, bazată pe:

- 
dovezi video cu hash criptografic,

- 
scripturi PoC,

- 
loguri de rețea,

- 
commit-uri Git timestamp-ate,

- 
corespondență oficială Meta.

### 2. Contextul descoperirii

Vulnerabilitatea a fost descoperită **accidental**, în timpul dezvoltării unui workflow automation tool pentru cereri HTTP.

Analizând răspunsuri HTML returnate de **Instagram mobile web**, am observat un comportament neobișnuit:

- 
conținut media era returnat în HTML,

- 
deși cererea era complet neautentificată,

- 
iar profilul țintă era setat explicit ca *private*.

Inițial, ipotezele luate în calcul au fost:

- 
cache CDN defectuos,

- 
bleed de sesiune,

- 
eroare locală de testare.

Toate au fost eliminate prin testare repetată și controlată.

### 3. Confirmarea vulnerabilității

Pentru a exclude orice posibilitate de eroare, testarea a fost repetată pe **propriul meu cont privat**:

- 
Contul a fost setat *private*

- 
A fost publicată o postare nouă

- 
S-a așteptat propagarea normală

- 
S-a trimis o cerere GET **fără login, cookie, token sau sesiune**

Rezultatul:

- 
postarea privată era prezentă în răspuns,

- 
imaginea se putea accesa direct din CDN,

- 
descrierea (caption) era inclusă.

Acest pas este esențial: **nu exista niciun vector de atac „extern”**.

Serverul Instagram genera date private pentru utilizatori neautentificați.

### 4. Descriere tehnică detaliată

### 

#### 4.1 Endpoint-ul

#### 

<pre>GET https://www.instagram.com/<username_privat>/
</pre>

Cererea:

- 
nu include cookie-uri

- 
nu include token-uri

- 
nu include headere de autentificare

Singura condiție era utilizarea unor **headere specifice mobile** (User-Agent / Accept).

#### 4.2 Răspunsul serverului

Serverul returna HTML care conținea **JSON embeduit**.

În structura acestui JSON apărea obiectul:

<pre>polaris_timeline_connection
</pre>

Cu următoarea structură relevantă:

<pre>{
  "polaris_timeline_connection": {
    "edges": [
      {
        "node": {
          "display_url": "https://scontent.cdninstagram.com/...",
          "edge_media_to_caption": {
            "edges": [
              { "node": { "text": "caption privat" } }
            ]
          }
        }
      }
    ]
  }
}
</pre>

#### 

#### 

#### 4.3 De ce este critic

#### 

- 
edges[] **nu ar trebui populat** pentru conturi private

- 
popularea lui implică **verificări de autorizare server-side**

- 
CDN-ul servește conținut valid, pentru că backend-ul l-a expus

 **Nu este un bug de frontend.**

 **Nu este un bug de cache.**

 **Este o eroare logică de autorizare în backend.**

### 5. Proof of Concept (PoC)

### 

![Image](https://www.zebrabyte.ro/web/image/8459-6781438a/1_bsBuODVfovCc1ygHt-bO8Q.webp?access_token=66fce926-7977-47b7-8b4b-410e396dae0a)

A fost creat un script Python care:

- 
Trimite cererea neautentificată

- 
Extrage JSON-ul embeduit

- 
Parcurge polaris_timeline_connection.edges

- 
Obține display_url

- 
Accesează direct conținutul privat din CDN

Scriptul a fost:

- 
rulat local

- 
filmat

- 
folosit pe conturi terțe **doar cu acord explicit**

![Image](https://www.zebrabyte.ro/web/image/8458-85950553/1_Rs5I1SCtOZ10bO5qXzxzQA.webp?access_token=82d3995b-f3c8-408b-b3c1-1da82642e1ed)

### 6. Testare controlată

### 

Testarea oficială a fost limitată strict la conturi cu permisiune.

**Rezultate:**

- 
Total conturi testate: **7**

- 
Conturi vulnerabile: **2 (~28%)**

- 
Conturi neafectate: **5**

Observații:

- 
vulnerabilitatea era **condițională**

- 
nu afecta toate conturile private

- 
primele indicii sugerau o corelație cu **vechimea contului**

- 
cauza exactă nu a fost determinată

Această natură condițională crește severitatea problemei, deoarece:

- 
este greu de detectat,

- 
este greu de confirmat ca rezolvată,

- 
este ușor de negat.

### 7. Disclosure către Meta – cronologie

###  completă

### 

#### 12 octombrie 2025

- 
Raport inițial trimis către Meta Bug Bounty

- 
Includea:

<li>
explicație tehnică

- 
script PoC

- 
demonstrație video

</li>

**Răspuns Meta:**

Caz închis ca „CDN caching issue”.

#### 13–15 octombrie 2025

#### 

- 
Raport nou, reformulat explicit ca **server-side authorization bypass**

- 
Meta începe dialogul

Acțiuni:

- 
Meta solicită test pe contul lor → nu vulnerabil

- 
Meta solicită cont vulnerabil → furnizat cu acord

- 
Vulnerabilitatea este demonstrată din nou

- 
Sunt trimise:

<li>
video-uri

- 
script

- 
explicație a stării „trigger”

![Image](https://www.zebrabyte.ro/web/image/8457-1f985f8c/1_XssghX4BAGZ9mWmGziqQBQ.webp?access_token=908b86e5-93d2-4989-bd64-d57377b4acef)
<li class="oe-nested">

</li>
</li>

#### 

#### 16 octombrie 2025

#### 

- 
Vulnerabilitatea nu mai funcționează

- 
Toate conturile anterior afectate returnează edges: []

Nu există:

- 
notificare

- 
confirmare

- 
explicație

#### 27 octombrie 2025

Meta răspunde oficial:

<blockquote>
„We are unable to reproduce this issue.”
</blockquote>

Cazul este închis ca **Not Applicable**.

### 8. Starea „trigger” – indiciu critic

În timpul exploatării, un indicator consistent era:

- 
cont privat afișat cu **0 followers / 0 following**

- 
story ring prezent

- 
timeline populat cu date reale

Această inconsecvență indică:

- 
un **state intern corupt**

- 
un flux de execuție unde verificările de autorizare sunt sărite

### 9. Ce NU a făcut Meta

### 

- 
**Nu a cerut loguri de debug**

Au fost oferite explicit (X-FB-Debug headers). Ignorate.

- 
**Nu a analizat natura condițională**

Lista comparativă de conturi afectate a fost ignorată.

- 
**Nu există Root Cause Analysis**

„Infrastructure changes” ≠ analiză de securitate.

Fără RCA, nu există garanția că:

- 
problema nu reapare,

- 
aceeași clasă de bug nu există în altă parte.

### 10. Dovezi și integritate

Au fost arhivate și versionate:

- 
script PoC

- 
capturi before / after

- 
4 video-uri cu timestamp + SHA256

- 
arhivă completă de comunicare Meta

- 
loguri de rețea

- 
istoric Git public

 Dovezile **nu pot fi fabricate retroactiv**.

### 11. Impact real

Instagram deservește **peste 1 miliard de utilizatori**.

Un bug care:

- 
afectează doar unele conturi private,

- 
nu lasă urme vizibile,

- 
nu notifică utilizatorii,

este **extrem de periculos**.

Utilizatorii se bazează pe faptul că *private* înseamnă *private*.

### 12. De ce acest disclosure este public

### 

- 
standardul industriei: **90 zile**

- 
Meta a avut **102 zile**

- 
exploit-ul nu mai funcționează

- 
nu a existat recunoaștere sau transparență

Scopul acestui articol:

- 
documentare istorică

- 
verificare independentă

- 
responsabilitate publică

### 13. Concluzie

### 

Întrebarea reală nu este:

<blockquote>
„Mai funcționează azi?”
</blockquote>

Ci:

<blockquote>
**Au fost expuse date private utilizatorilor neautorizați?**
</blockquote>

Pe baza dovezilor tehnice, cronologice și criptografice:

**da, au fost.**

### **Technical Details**

For those who want to dig deeper:

- **Github& README —** [Overview and evidence links](https://github.com/jatin-dot-py/instagram-private-bypass)
- **TIMELINE.md with videos, images**— [Complete chronological record](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/TIMELINE.md)
- **poc.py **—[ Proof-of-concept script](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/poc.py)
- **official_communication/ **— [Full Meta correspondence (PDF)](https://github.com/jatin-dot-py/instagram-private-bypass/tree/main/official_communication)

#### Before

![Image](https://www.zebrabyte.ro/web/image/8461-c6dfdfe7/1_RFcZRkk8RDlUjCwfAdmlSQ.webp)

#### 

#### After

![Image](https://www.zebrabyte.ro/web/image/8460-0c5e975a/1_ceBwPLoCrii_0slfHi86yg.webp?access_token=50997a01-36d4-4af3-877d-1f8718492eb5)
", "ro_RO": "
### Expunerea postărilor private pe Instagram prin polaris_timeline_connection

##### 
Analiză tehnică completă a unei vulnerabilități server-side negate oficial

**Platformă afectată:** Instagram

**Deținut de:** Meta

**Perioada descoperirii:** Octombrie 2025

**Durata disclosure-ului:** 102 zile

**Tip vulnerabilitate:** Server-side authorization bypass

**Impact:** Acces neautorizat la conținut privat (imagini + descrieri)

**Status final:** Patch aplicat în tăcere, caz închis ca *Not Applicable*

### 1. Introducere

### 

Acest articol documentează **o vulnerabilitate reală, exploatabilă și demonstrată** din infrastructura Instagram (mobile web), care a permis **acces complet neautentificat** la postări aparținând unor conturi setate ca *private*.

Deși problema a fost **corectată în mod demonstrabil** la scurt timp după raportare, Meta a refuzat recunoașterea existenței ei, susținând că nu a fost niciodată reproductibilă.

Articolul de față nu este o opinie, ci o **reconstrucție tehnică și cronologică**, bazată pe:

- 
dovezi video cu hash criptografic,

- 
scripturi PoC,

- 
loguri de rețea,

- 
commit-uri Git timestamp-ate,

- 
corespondență oficială Meta.

### 2. Contextul descoperirii

Vulnerabilitatea a fost descoperită **accidental**, în timpul dezvoltării unui workflow automation tool pentru cereri HTTP.

Analizând răspunsuri HTML returnate de **Instagram mobile web**, am observat un comportament neobișnuit:

- 
conținut media era returnat în HTML,

- 
deși cererea era complet neautentificată,

- 
iar profilul țintă era setat explicit ca *private*.

Inițial, ipotezele luate în calcul au fost:

- 
cache CDN defectuos,

- 
bleed de sesiune,

- 
eroare locală de testare.

Toate au fost eliminate prin testare repetată și controlată.

### 3. Confirmarea vulnerabilității

Pentru a exclude orice posibilitate de eroare, testarea a fost repetată pe **propriul meu cont privat**:

- 
Contul a fost setat *private*

- 
A fost publicată o postare nouă

- 
S-a așteptat propagarea normală

- 
S-a trimis o cerere GET **fără login, cookie, token sau sesiune**

Rezultatul:

- 
postarea privată era prezentă în răspuns,

- 
imaginea se putea accesa direct din CDN,

- 
descrierea (caption) era inclusă.

Acest pas este esențial: **nu exista niciun vector de atac „extern”**.

Serverul Instagram genera date private pentru utilizatori neautentificați.

### 4. Descriere tehnică detaliată

### 

#### 4.1 Endpoint-ul

#### 

<pre>GET https://www.instagram.com/<username_privat>/
</pre>

Cererea:

- 
nu include cookie-uri

- 
nu include token-uri

- 
nu include headere de autentificare

Singura condiție era utilizarea unor **headere specifice mobile** (User-Agent / Accept).

#### 4.2 Răspunsul serverului

Serverul returna HTML care conținea **JSON embeduit**.

În structura acestui JSON apărea obiectul:

<pre>polaris_timeline_connection
</pre>

Cu următoarea structură relevantă:

<pre>{
  "polaris_timeline_connection": {
    "edges": [
      {
        "node": {
          "display_url": "https://scontent.cdninstagram.com/...",
          "edge_media_to_caption": {
            "edges": [
              { "node": { "text": "caption privat" } }
            ]
          }
        }
      }
    ]
  }
}
</pre>

#### 

#### 

#### 4.3 De ce este critic

#### 

- 
edges[] **nu ar trebui populat** pentru conturi private

- 
popularea lui implică **verificări de autorizare server-side**

- 
CDN-ul servește conținut valid, pentru că backend-ul l-a expus

 **Nu este un bug de frontend.**

 **Nu este un bug de cache.**

 **Este o eroare logică de autorizare în backend.**

### 5. Proof of Concept (PoC)

### 

![Image](https://www.zebrabyte.ro/web/image/8459-6781438a/1_bsBuODVfovCc1ygHt-bO8Q.webp?access_token=66fce926-7977-47b7-8b4b-410e396dae0a)

A fost creat un script Python care:

- 
Trimite cererea neautentificată

- 
Extrage JSON-ul embeduit

- 
Parcurge polaris_timeline_connection.edges

- 
Obține display_url

- 
Accesează direct conținutul privat din CDN

Scriptul a fost:

- 
rulat local

- 
filmat

- 
folosit pe conturi terțe **doar cu acord explicit**

![Image](https://www.zebrabyte.ro/web/image/8458-85950553/1_Rs5I1SCtOZ10bO5qXzxzQA.webp?access_token=82d3995b-f3c8-408b-b3c1-1da82642e1ed)

### 6. Testare controlată

### 

Testarea oficială a fost limitată strict la conturi cu permisiune.

**Rezultate:**

- 
Total conturi testate: **7**

- 
Conturi vulnerabile: **2 (~28%)**

- 
Conturi neafectate: **5**

Observații:

- 
vulnerabilitatea era **condițională**

- 
nu afecta toate conturile private

- 
primele indicii sugerau o corelație cu **vechimea contului**

- 
cauza exactă nu a fost determinată

Această natură condițională crește severitatea problemei, deoarece:

- 
este greu de detectat,

- 
este greu de confirmat ca rezolvată,

- 
este ușor de negat.

### 7. Disclosure către Meta – cronologie

###  completă

### 

#### 12 octombrie 2025

- 
Raport inițial trimis către Meta Bug Bounty

- 
Includea:

<li>
explicație tehnică

- 
script PoC

- 
demonstrație video

</li>

**Răspuns Meta:**

Caz închis ca „CDN caching issue”.

#### 13–15 octombrie 2025

#### 

- 
Raport nou, reformulat explicit ca **server-side authorization bypass**

- 
Meta începe dialogul

Acțiuni:

- 
Meta solicită test pe contul lor → nu vulnerabil

- 
Meta solicită cont vulnerabil → furnizat cu acord

- 
Vulnerabilitatea este demonstrată din nou

- 
Sunt trimise:

<li>
video-uri

- 
script

- 
explicație a stării „trigger”

![Image](https://www.zebrabyte.ro/web/image/8457-1f985f8c/1_XssghX4BAGZ9mWmGziqQBQ.webp?access_token=908b86e5-93d2-4989-bd64-d57377b4acef)
<li class="oe-nested">

</li>
</li>

#### 

#### 16 octombrie 2025

#### 

- 
Vulnerabilitatea nu mai funcționează

- 
Toate conturile anterior afectate returnează edges: []

Nu există:

- 
notificare

- 
confirmare

- 
explicație

#### 27 octombrie 2025

Meta răspunde oficial:

<blockquote>
„We are unable to reproduce this issue.”
</blockquote>

Cazul este închis ca **Not Applicable**.

### 8. Starea „trigger” – indiciu critic

În timpul exploatării, un indicator consistent era:

- 
cont privat afișat cu **0 followers / 0 following**

- 
story ring prezent

- 
timeline populat cu date reale

Această inconsecvență indică:

- 
un **state intern corupt**

- 
un flux de execuție unde verificările de autorizare sunt sărite

### 9. Ce NU a făcut Meta

### 

- 
**Nu a cerut loguri de debug**

Au fost oferite explicit (X-FB-Debug headers). Ignorate.

- 
**Nu a analizat natura condițională**

Lista comparativă de conturi afectate a fost ignorată.

- 
**Nu există Root Cause Analysis**

„Infrastructure changes” ≠ analiză de securitate.

Fără RCA, nu există garanția că:

- 
problema nu reapare,

- 
aceeași clasă de bug nu există în altă parte.

### 10. Dovezi și integritate

Au fost arhivate și versionate:

- 
script PoC

- 
capturi before / after

- 
4 video-uri cu timestamp + SHA256

- 
arhivă completă de comunicare Meta

- 
loguri de rețea

- 
istoric Git public

 Dovezile **nu pot fi fabricate retroactiv**.

### 11. Impact real

Instagram deservește **peste 1 miliard de utilizatori**.

Un bug care:

- 
afectează doar unele conturi private,

- 
nu lasă urme vizibile,

- 
nu notifică utilizatorii,

este **extrem de periculos**.

Utilizatorii se bazează pe faptul că *private* înseamnă *private*.

### 12. De ce acest disclosure este public

### 

- 
standardul industriei: **90 zile**

- 
Meta a avut **102 zile**

- 
exploit-ul nu mai funcționează

- 
nu a existat recunoaștere sau transparență

Scopul acestui articol:

- 
documentare istorică

- 
verificare independentă

- 
responsabilitate publică

### 13. Concluzie

### 

Întrebarea reală nu este:

<blockquote>
„Mai funcționează azi?”
</blockquote>

Ci:

<blockquote>
**Au fost expuse date private utilizatorilor neautorizați?**
</blockquote>

Pe baza dovezilor tehnice, cronologice și criptografice:

**da, au fost.**

### **Technical Details**

For those who want to dig deeper:

- **Github& README —** [Overview and evidence links](https://github.com/jatin-dot-py/instagram-private-bypass)
- **TIMELINE.md with videos, images**— [Complete chronological record](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/TIMELINE.md)
- **poc.py **—[ Proof-of-concept script](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/poc.py)
- **official_communication/ **— [Full Meta correspondence (PDF)](https://github.com/jatin-dot-py/instagram-private-bypass/tree/main/official_communication)

#### Before

![Image](https://www.zebrabyte.ro/web/image/8461-c6dfdfe7/1_RFcZRkk8RDlUjCwfAdmlSQ.webp)

#### 

#### After

![Image](https://www.zebrabyte.ro/web/image/8460-0c5e975a/1_ceBwPLoCrii_0slfHi86yg.webp?access_token=50997a01-36d4-4af3-877d-1f8718492eb5)
", "_en_GB": "
### Expunerea postărilor private pe Instagram prin polaris_timeline_connection

##### 
Analiză tehnică completă a unei vulnerabilități server-side negate oficial

**Platformă afectată:** Instagram

**Deținut de:** Meta

**Perioada descoperirii:** Octombrie 2025

**Durata disclosure-ului:** 102 zile

**Tip vulnerabilitate:** Server-side authorization bypass

**Impact:** Acces neautorizat la conținut privat (imagini + descrieri)

**Status final:** Patch aplicat în tăcere, caz închis ca *Not Applicable*

### 1. Introducere

### 

Acest articol documentează **o vulnerabilitate reală, exploatabilă și demonstrată** din infrastructura Instagram (mobile web), care a permis **acces complet neautentificat** la postări aparținând unor conturi setate ca *private*.

Deși problema a fost **corectată în mod demonstrabil** la scurt timp după raportare, Meta a refuzat recunoașterea existenței ei, susținând că nu a fost niciodată reproductibilă.

Articolul de față nu este o opinie, ci o **reconstrucție tehnică și cronologică**, bazată pe:

- 
dovezi video cu hash criptografic,

- 
scripturi PoC,

- 
loguri de rețea,

- 
commit-uri Git timestamp-ate,

- 
corespondență oficială Meta.

### 2. Contextul descoperirii

Vulnerabilitatea a fost descoperită **accidental**, în timpul dezvoltării unui workflow automation tool pentru cereri HTTP.

Analizând răspunsuri HTML returnate de **Instagram mobile web**, am observat un comportament neobișnuit:

- 
conținut media era returnat în HTML,

- 
deși cererea era complet neautentificată,

- 
iar profilul țintă era setat explicit ca *private*.

Inițial, ipotezele luate în calcul au fost:

- 
cache CDN defectuos,

- 
bleed de sesiune,

- 
eroare locală de testare.

Toate au fost eliminate prin testare repetată și controlată.

### 3. Confirmarea vulnerabilității

Pentru a exclude orice posibilitate de eroare, testarea a fost repetată pe **propriul meu cont privat**:

- 
Contul a fost setat *private*

- 
A fost publicată o postare nouă

- 
S-a așteptat propagarea normală

- 
S-a trimis o cerere GET **fără login, cookie, token sau sesiune**

Rezultatul:

- 
postarea privată era prezentă în răspuns,

- 
imaginea se putea accesa direct din CDN,

- 
descrierea (caption) era inclusă.

Acest pas este esențial: **nu exista niciun vector de atac „extern”**.

Serverul Instagram genera date private pentru utilizatori neautentificați.

### 4. Descriere tehnică detaliată

### 

#### 4.1 Endpoint-ul

#### 

<pre>GET https://www.instagram.com/<username_privat>/
</pre>

Cererea:

- 
nu include cookie-uri

- 
nu include token-uri

- 
nu include headere de autentificare

Singura condiție era utilizarea unor **headere specifice mobile** (User-Agent / Accept).

#### 4.2 Răspunsul serverului

Serverul returna HTML care conținea **JSON embeduit**.

În structura acestui JSON apărea obiectul:

<pre>polaris_timeline_connection
</pre>

Cu următoarea structură relevantă:

<pre>{
  "polaris_timeline_connection": {
    "edges": [
      {
        "node": {
          "display_url": "https://scontent.cdninstagram.com/...",
          "edge_media_to_caption": {
            "edges": [
              { "node": { "text": "caption privat" } }
            ]
          }
        }
      }
    ]
  }
}
</pre>

#### 

#### 

#### 4.3 De ce este critic

#### 

- 
edges[] **nu ar trebui populat** pentru conturi private

- 
popularea lui implică **verificări de autorizare server-side**

- 
CDN-ul servește conținut valid, pentru că backend-ul l-a expus

 **Nu este un bug de frontend.**

 **Nu este un bug de cache.**

 **Este o eroare logică de autorizare în backend.**

### 5. Proof of Concept (PoC)

### 

![Image](https://www.zebrabyte.ro/web/image/8459-6781438a/1_bsBuODVfovCc1ygHt-bO8Q.webp?access_token=66fce926-7977-47b7-8b4b-410e396dae0a)

A fost creat un script Python care:

- 
Trimite cererea neautentificată

- 
Extrage JSON-ul embeduit

- 
Parcurge polaris_timeline_connection.edges

- 
Obține display_url

- 
Accesează direct conținutul privat din CDN

Scriptul a fost:

- 
rulat local

- 
filmat

- 
folosit pe conturi terțe **doar cu acord explicit**

![Image](https://www.zebrabyte.ro/web/image/8458-85950553/1_Rs5I1SCtOZ10bO5qXzxzQA.webp?access_token=82d3995b-f3c8-408b-b3c1-1da82642e1ed)

### 6. Testare controlată

### 

Testarea oficială a fost limitată strict la conturi cu permisiune.

**Rezultate:**

- 
Total conturi testate: **7**

- 
Conturi vulnerabile: **2 (~28%)**

- 
Conturi neafectate: **5**

Observații:

- 
vulnerabilitatea era **condițională**

- 
nu afecta toate conturile private

- 
primele indicii sugerau o corelație cu **vechimea contului**

- 
cauza exactă nu a fost determinată

Această natură condițională crește severitatea problemei, deoarece:

- 
este greu de detectat,

- 
este greu de confirmat ca rezolvată,

- 
este ușor de negat.

### 7. Disclosure către Meta – cronologie

###  completă

### 

#### 12 octombrie 2025

- 
Raport inițial trimis către Meta Bug Bounty

- 
Includea:

<li>
explicație tehnică

- 
script PoC

- 
demonstrație video

</li>

**Răspuns Meta:**

Caz închis ca „CDN caching issue”.

#### 13–15 octombrie 2025

#### 

- 
Raport nou, reformulat explicit ca **server-side authorization bypass**

- 
Meta începe dialogul

Acțiuni:

- 
Meta solicită test pe contul lor → nu vulnerabil

- 
Meta solicită cont vulnerabil → furnizat cu acord

- 
Vulnerabilitatea este demonstrată din nou

- 
Sunt trimise:

<li>
video-uri

- 
script

- 
explicație a stării „trigger”

![Image](https://www.zebrabyte.ro/web/image/8457-1f985f8c/1_XssghX4BAGZ9mWmGziqQBQ.webp?access_token=908b86e5-93d2-4989-bd64-d57377b4acef)
<li class="oe-nested">

</li>
</li>

#### 

#### 16 octombrie 2025

#### 

- 
Vulnerabilitatea nu mai funcționează

- 
Toate conturile anterior afectate returnează edges: []

Nu există:

- 
notificare

- 
confirmare

- 
explicație

#### 27 octombrie 2025

Meta răspunde oficial:

<blockquote>
„We are unable to reproduce this issue.”
</blockquote>

Cazul este închis ca **Not Applicable**.

### 8. Starea „trigger” – indiciu critic

În timpul exploatării, un indicator consistent era:

- 
cont privat afișat cu **0 followers / 0 following**

- 
story ring prezent

- 
timeline populat cu date reale

Această inconsecvență indică:

- 
un **state intern corupt**

- 
un flux de execuție unde verificările de autorizare sunt sărite

### 9. Ce NU a făcut Meta

### 

- 
**Nu a cerut loguri de debug**

Au fost oferite explicit (X-FB-Debug headers). Ignorate.

- 
**Nu a analizat natura condițională**

Lista comparativă de conturi afectate a fost ignorată.

- 
**Nu există Root Cause Analysis**

„Infrastructure changes” ≠ analiză de securitate.

Fără RCA, nu există garanția că:

- 
problema nu reapare,

- 
aceeași clasă de bug nu există în altă parte.

### 10. Dovezi și integritate

Au fost arhivate și versionate:

- 
script PoC

- 
capturi before / after

- 
4 video-uri cu timestamp + SHA256

- 
arhivă completă de comunicare Meta

- 
loguri de rețea

- 
istoric Git public

 Dovezile **nu pot fi fabricate retroactiv**.

### 11. Impact real

Instagram deservește **peste 1 miliard de utilizatori**.

Un bug care:

- 
afectează doar unele conturi private,

- 
nu lasă urme vizibile,

- 
nu notifică utilizatorii,

este **extrem de periculos**.

Utilizatorii se bazează pe faptul că *private* înseamnă *private*.

### 12. De ce acest disclosure este public

### 

- 
standardul industriei: **90 zile**

- 
Meta a avut **102 zile**

- 
exploit-ul nu mai funcționează

- 
nu a existat recunoaștere sau transparență

Scopul acestui articol:

- 
documentare istorică

- 
verificare independentă

- 
responsabilitate publică

### 13. Concluzie

### 

Întrebarea reală nu este:

<blockquote>
„Mai funcționează azi?”
</blockquote>

Ci:

<blockquote>
**Au fost expuse date private utilizatorilor neautorizați?**
</blockquote>

Pe baza dovezilor tehnice, cronologice și criptografice:

**da, au fost.**

### **Technical Details**

For those who want to dig deeper:

- **Github& README —** [Overview and evidence links](https://github.com/jatin-dot-py/instagram-private-bypass)
- **TIMELINE.md with videos, images**— [Complete chronological record](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/TIMELINE.md)
- **poc.py **—[ Proof-of-concept script](https://github.com/jatin-dot-py/instagram-private-bypass/blob/main/poc.py)
- **official_communication/ **— [Full Meta correspondence (PDF)](https://github.com/jatin-dot-py/instagram-private-bypass/tree/main/official_communication)

#### Before

![Image](https://www.zebrabyte.ro/web/image/8461-c6dfdfe7/1_RFcZRkk8RDlUjCwfAdmlSQ.webp)

#### 

#### After

![Image](https://www.zebrabyte.ro/web/image/8460-0c5e975a/1_ceBwPLoCrii_0slfHi86yg.webp?access_token=50997a01-36d4-4af3-877d-1f8718492eb5)
"}
