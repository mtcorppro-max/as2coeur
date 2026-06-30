# Guide des rôles — AS2CŒUR

Qui voit quoi, qui fait quoi. Multi‑tenant : **Prestataire → Régions → Agences**.
Niveaux d'accès : **0** plateforme · **1** manager (région) · **2** agence ·
**3** rattaché · **hors‑hiérarchie** (RH, personnel : aucun accès patient).

> L'accès aux patients est cloisonné par la base (RLS) : personne ne voit au‑delà
> de son périmètre. La **recherche (loupe)** est disponible pour tous, mais ne
> renvoie que ce que le compte a le droit de voir (les patients sont masqués aux
> rôles sans accès patient).

---

## 👤 Patient
- **Voit** : uniquement son propre dossier.
- **Fait** : saisit ses **constantes**, envoie des **photos de cicatrice**,
  consulte **conseils + météo**, **messagerie** avec l'équipe.

## 🧑‍⚕️ Infirmière coordinatrice (niveau 2 agence / 3 rattaché)
- **Voit** : les patients de **son agence** (niv. 2) ou seulement ses patients
  **rattachés** (niv. 3).
- **Fait** : crée/édite la **fiche patient**, paramètre **seuils & alertes**,
  **Agenda** (suivis, livraisons, actions), **Ma tournée**, **Magasin**,
  **Ordonnances**, **Messagerie**, **Notes de frais**, **crée des comptes**.
- **Ne fait pas** : **saisie des constantes** (réservée patient + IDEL), PEC.
- **Notes de frais validées par** : son **manager**.

## 🧑‍💼 Manager (niveau 1, région)
- **Voit** : tous les patients de **sa région**.
- **Fait** : tout ce que fait la coordinatrice **+ PEC**, **valide le planning**
  (congés/astreintes) et les **notes de frais** des comptes hiérarchiques de sa
  région, **crée des comptes**, gère l'**équipe**.
- **Notes de frais validées par** : la **RH**.

## 🏛️ Dirigeant (vision nationale)
- **Voit** : tous les patients du **prestataire** (national, lecture).
- **Fait** : **PEC nationale**, **Marketing**, **Équipe dirigeante**,
  **Suivi DMOS + barème**, **Notes de frais**. Valide les notes de frais de la **RH**.
- **Notes de frais validées par** : la **RH**.

## 💼 Délégué médical (niveau 2/3)
- **Voit** : les patients **rattachés** (notamment via les médecins qui lui sont
  rattachés — rattachement automatique).
- **Fait** : consultation des dossiers, **Marketing**, **Notes de frais**
  (souvent les avantages DMOS aux médecins), **Messagerie**.
- **Notes de frais validées par** : son **manager**.

## 🩺 Chirurgien / Médecin (compte externe)
- **Voit** : **ses** patients.
- **Fait** : **signe les ordonnances** (« À signer »), reçoit les **alertes**
  patients (option à activer), **Messagerie**, protocoles.
- Peut porter un **délégué médical** rattaché (ses patients suivent au délégué).

## 💉 Infirmière libérale (externe, niveau 3)
- **Voit** : les patients **rattachés**.
- **Fait** : **saisit les constantes**, consulte le dossier, **Messagerie**.

## 💊 Pharmacie (compte service)
- **Voit** : ses patients rattachés (écran **« Mes patients »**).
- **Fait** : consulte les **ordonnances pharmacie signées** reçues.

## 🚚 Livreur (compte service)
- **Voit** : les patients de ses **livraisons**.
- **Fait** : **Ma tournée** (valider livraisons + **bon de livraison signé**),
  **Agenda**, **Magasin**, **Notes de frais**.
- **Notes de frais validées par** : son **manager**.

## 📦 Magasinier (compte service)
- **Voit** : pas de dossiers patients (sauf le nécessaire aux livraisons/parc).
- **Fait** : **Magasin** (stock, **QR codes**), **Préparation des commandes**
  (réservée au magasinier), **Parc matériel** (maintenance, locations),
  **Notes de frais**.
- **Notes de frais validées par** : son **manager**.

## 🧑‍💼 RH (hors hiérarchie)
- **Voit** : **aucun patient**. Tout le **personnel interne**.
- **Fait** : **Personnel** (annuaire + **édition des postes** + **création de
  comptes personnel**), **Marketing**, **Notes de frais**, **Messagerie**,
  recherche (personnel uniquement). Valide les notes de frais du **personnel**,
  des **managers** et du **dirigeant**.
- **Notes de frais validées par** : le **dirigeant**.

## 👷 Personnel (hors hiérarchie, générique)
- **Voit** : **aucun patient**.
- **Fait** : **Notes de frais**, **Messagerie**. Son **poste** est défini par la RH.
- **Notes de frais validées par** : la **RH**.

## 🛠️ Administrateur plateforme (niveau 0)
- **Voit / fait** : **tout**, tous prestataires (super‑admin). Création de tous
  types de comptes (dirigeant, RH…), barème DMOS, paramètres.

---

## Récap — accès patients
| Rôle | Périmètre patients |
|---|---|
| Admin (N0) | Tout |
| Dirigeant | Tout le prestataire (national) |
| Manager (N1) | Sa région |
| Coordinatrice (N2) | Son agence |
| Coordinatrice/IDEL/Délégué (N3) | Patients rattachés |
| Chirurgien | Ses patients |
| Pharmacie / Livreur | Patients rattachés / de tournée |
| Magasinier | — (logistique) |
| RH / Personnel | **Aucun** |
| Patient | Son dossier |

## Récap — validation des notes de frais
| Émetteur | Validé par |
|---|---|
| Coordinatrice · délégué · livreur · magasinier | Manager (sa région) |
| Personnel | RH |
| Manager | RH |
| Dirigeant | RH |
| RH | Dirigeant |

## Règles transversales
- **Saisie des constantes** : patient + infirmière libérale uniquement (jamais la coordinatrice).
- **Préparation des commandes / QR / stock** : magasinier uniquement.
- **Validation note de frais bloquée** si un avantage dépasse le **seuil DMOS**
  sans autorisation préalable.
- **Médecin → délégué** : les patients d'un médecin sont auto‑rattachés à son délégué.
- **PEC (facturation Sécu)** : managers (N1) et plateforme (N0) ; + dirigeant en national.
