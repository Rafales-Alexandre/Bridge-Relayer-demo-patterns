# Blockchain Bridge Demo

Ce dépôt démontre un mécanisme simple de bridge blockchain utilisant des smart contracts Solidity et un relayer off-chain en TypeScript. Il permet de transférer des tokens ERC20 entre deux chaînes simulées en verrouillant/brûlant d’un côté et en mintant/libérant de l’autre. L’ensemble utilise Hardhat pour le développement et les tests locaux.

> **⚠️ Ceci est un exemple pédagogique — non prêt pour la production. Auditez toujours le code avant toute utilisation réelle.**

---

## Fonctionnement du Bridge

1. **Source Chain** : Verrouille les tokens originaux et émet un événement.
2. **Relayer** : Écoute les événements et déclenche les actions sur la chaîne de destination.
3. **Destination Chain** : Mint les tokens "wrapped" sur le bridge aller ; brûle les tokens wrapped et émet un événement pour le retour.

---

## Prérequis

- Node.js (v18+ recommandé)
- npm ou yarn
- Connaissances de base en Solidity, TypeScript et développement Ethereum

---

## Installation

Clonez le dépôt :

```bash
git clone <your-repo-url>
cd bridge-demo
```

Installez les dépendances :

```bash
npm install
```

Cela inclut Hardhat, Ethers.js, les contrats OpenZeppelin, les outils TypeScript et les librairies de test.

Compilez les contrats Solidity :

```bash
npx hardhat compile
```

---

## Structure du projet

```
contracts/           # Fichiers Solidity
  ├─ MockToken.sol         # ERC20 pour les tests sur la source
  ├─ BridgeSourceChain.sol # Gère le lock/release
  └─ BridgeDestinationChain.sol # Mint/burn des tokens wrapped
scripts/            # Scripts TypeScript
  ├─ deploy.ts            # Déploie tous les contrats
  ├─ transfer-tokens.ts   # Transfère des tokens MockToken à un utilisateur
  ├─ relayer-test.ts      # Test automatisé du bridge complet
  └─ relayer.ts           # Relayer off-chain (écoute et relaye les events)
test/               # Tests unitaires TypeScript
  └─ Bridge.test.ts       # Tests des interactions de contrats
hardhat.config.ts   # Configuration Hardhat
```

---

## Explications du Code

### BridgeSourceChain.sol (Source Chain)

Ce contrat gère le verrouillage des tokens sur la chaîne source et la libération lors du bridge retour. Il utilise un token ERC20 externe et restreint la libération au relayer.

```solidity
contract BridgeSourceChain {
    address public token;
    address public relayer;

    event TokenLocked(address indexed user, uint amount, address destination);

    constructor(address _token, address _relayer) {
        token = _token;
        relayer = _relayer;
    }

    function lock(uint amount, address destination) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit TokenLocked(msg.sender, amount, destination);
    }

    function release(address user, uint amount) external {
        require(msg.sender == relayer, "Only relayer can release");
        require(IERC20(token).transfer(user, amount), "Transfer failed");
    }
}
```

- **lock** : Transfère les tokens de l’utilisateur vers le contrat (verrouillage) et émet `TokenLocked`.
- **release** : Appelable uniquement par le relayer ; transfère les tokens verrouillés à l’utilisateur.

### BridgeDestinationChain.sol (Destination Chain)

Ce contrat gère le mint des tokens wrapped sur la chaîne de destination et le burn pour le bridge retour. Il utilise une interface `IWrappedToken`.

```solidity
interface IWrappedToken {
    function mint(address to, uint amount) external;
    function burnFrom(address from, uint amount) external;
}

contract BridgeDestinationChain {
    address public wrappedToken;
    address public relayer;

    event TokenBurned(address indexed user, uint amount, address destination);

    constructor(address _wrappedToken, address _relayer) {
        wrappedToken = _wrappedToken;
        relayer = _relayer;
    }

    function mintWrapped(address user, uint amount) external {
        require(msg.sender == relayer, "Only relayer can mint");
        IWrappedToken(wrappedToken).mint(user, amount);
    }

    function burn(uint amount, address destination) external {
        IWrappedToken(wrappedToken).burnFrom(msg.sender, amount);
        emit TokenBurned(msg.sender, amount, destination);
    }
}
```

- **mintWrapped** : Appelable uniquement par le relayer ; mint des tokens wrapped à l’utilisateur.
- **burn** : Brûle les tokens wrapped de l’utilisateur et émet `TokenBurned`.

> **Note** : Il faut un contrat WrappedToken séparé implémentant `IWrappedToken` (ex : ERC20 avec mint/burn accessibles par le bridge).

### Relayer Off-chain (relayer.ts)

Le relayer écoute les événements sur les deux contrats et automatise les actions cross-chain avec Ethers.js.

```typescript
// Écoute des events côté source (lock -> mint)
bridgeSourceChain.on("TokenLocked", async (user, amount, destination) => {
  console.log(`[BridgeSource] ${user} locked ${amount} tokens. Minting on destination for ${destination}...`);
  const tx = await bridgeDestinationChain.mintWrapped(destination, amount);
  await tx.wait();
  console.log("Minted wrapped tokens on destination");
});

// Écoute des events côté destination (burn -> release)
bridgeDestinationChain.on("TokenBurned", async (user, amount, destination) => {
  console.log(`[BridgeDestination] ${user} burned ${amount} wrapped tokens. Releasing on source to ${destination}...`);
  const tx = await bridgeSourceChain.release(destination, amount);
  await tx.wait();
  console.log("Released tokens on source");
});
```

- Écoute `TokenLocked` et appelle `mintWrapped` sur la destination.
- Écoute `TokenBurned` et appelle `release` sur la source.

---

## Utilisation pas à pas

### 1. Démarrer le nœud local Hardhat

```bash
npx hardhat node
```

Cela lance un serveur JSON-RPC à http://127.0.0.1:8545 avec des comptes de test prédéfinis.

> **Astuce** : Redémarrez le nœud si vous avez des problèmes de nonce ou d’état (Ctrl+C puis relancez).

### 2. Déployer les contrats

Dans un nouveau terminal :

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Cela déploie MockToken, WrappedToken, BridgeSourceChain et BridgeDestinationChain.
Copiez les adresses déployées depuis la console.
Mettez à jour ces adresses dans `relayer.ts`, `relayer-test.ts` et `transfer-tokens.ts`.

- **Deployer** : Compte Hardhat #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
- **Relayer** : Compte #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)

### 3. Transférer des tokens à un utilisateur de test (optionnel mais recommandé)

Le deployer possède les MockTokens initiaux. Transférez-en à un compte utilisateur pour les tests :

```bash
npx hardhat run scripts/transfer-tokens.ts --network localhost
```

Utilisateur par défaut : Compte #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
Cela transfère 100 MockTokens.

### 4. Lancer les tests unitaires

```bash
npx hardhat test
```

Cela exécute `Bridge.test.ts`, simulant lock/mint et burn/release manuellement (sans relayer).

### 5. Démarrer le relayer

Le relayer écoute les événements et automatise le bridge. Mettez à jour les adresses dans `relayer.ts`, puis lancez :

```bash
npx ts-node relayer.ts
```

Il utilise la clé privée du compte #1 comme relayer (autorisé dans les contrats).

### 6. Tester le bridge complet

Avec le nœud et le relayer actifs, testez le flux complet (lock → mint via relayer → burn → release via relayer). Mettez à jour les adresses et la clé privée utilisateur dans `relayer-test.ts`, puis lancez :

```bash
npx ts-node .\scripts\relayer-test.ts
```

- Approuve/lock 10 tokens, attend le mint, les brûle, attend la release.
- Résultat attendu : `Test completed successfully!` avec les logs de balance.

> **En cas d’erreur** ("Only relayer", problèmes de nonce, etc.) :
> - Vérifiez que la clé du relayer correspond à celle autorisée.
> - Redémarrez le nœud et redeployez si l’état est corrompu.

---

## Sécurité & Limitations

- **Démo simplifiée** : Ajoutez multisig, pause, audits, rate limits pour la prod.
- **Relayer centralisé** : Pour la prod, envisagez Chainlink, zk-proofs, etc.
- **Ne jamais utiliser de vrais fonds ou du code non audité !**

---

## Dépannage

- **Nonce Errors** : Redémarrez le nœud Hardhat et redeployez.
- **Insufficient Balance** : Exécutez le script de transfert.
- **"Only relayer" Revert** : Vérifiez la clé du relayer.
- **BAD_DATA sur balanceOf** : Vérifiez que les contrats sont bien déployés.

---

## Remerciements

Inspiré par les concepts de bridge blockchain — contributions bienvenues ! Si ce projet vous aide, n’hésitez pas à mettre une étoile ⭐.

