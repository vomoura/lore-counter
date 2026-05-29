# ✦ Lorcana Lore Counter

Contador de Lore para **Disney Lorcana**, feito como PWA para dois jogadores com visual temático, haptic feedback e um dial de precisão.

🔗 **[Abrir o app](https://vomoura.github.io/lore-counter/)**

---

## O que o app faz

A tela é dividida ao meio: cada jogador tem seu próprio espaço com o símbolo de Lore, contador, botões e slider. O Jogador 2 fica invertido no topo para que os dois possam jogar frente a frente com o celular entre eles.

### Contador
Os botões **+** e **-** incrementam e decrementam o lore entre 0 e 20. O dial horizontal é o diferencial: deslize o dedo para ajustar o valor com precisão, como um dial de rádio, com vibração a cada tick.

### Fim de jogo
Quando um jogador chega a 20 lore, a tela escurece, o vencedor é destacado com glow e um botão **FIM DO JOGO** aparece sobre o divisor. Ao clicar, um modal exibe o vencedor e oferece a opção de iniciar um novo jogo.

### Efeito de carta
O botão ✦ no lado direito do divisor abre o painel de exceção do *Donald Duck - Flustered Sorcerer*. Ao marcar qual jogador possui a carta, o oponente desse jogador precisará de **25 lore** para vencer. O efeito persiste até o início de um novo jogo ou até ser desmarcado manualmente.

### Histórico de partida
O botão 🕐 no lado esquerdo do divisor abre o log da partida. Inputs consecutivos com menos de 2 segundos de intervalo são consolidados em um único registro. Cada entrada mostra o jogador, o delta acumulado e o placar antes e depois da alteração.

---

## Instalação

O app funciona direto no navegador, mas pode ser instalado como PWA para abrir em tela cheia sem barra do navegador.

**Android (Chrome)**
1. Acesse [https://vomoura.github.io/lore-counter/](https://vomoura.github.io/lore-counter/)
2. Toque no menu `⋮` e depois em **Adicionar à tela inicial**

**iOS (Safari)**
1. Acesse o link acima
2. Toque em **Compartilhar** e depois em **Adicionar à Tela de Início**

---

## Paleta de cores

| Cor | Nome | Hex |
|-----|------|-----|
| ![#373B70](https://placehold.co/16x16/373B70/373B70.png) | Lorcana Indigo | `#373B70` |
| ![#D3BA84](https://placehold.co/16x16/D3BA84/D3BA84.png) | Illuminary Gold | `#D3BA84` |
| ![#E3CAA8](https://placehold.co/16x16/E3CAA8/E3CAA8.png) | Parchment | `#E3CAA8` |
| ![#1C1C1A](https://placehold.co/16x16/1C1C1A/1C1C1A.png) | Kelp | `#1C1C1A` |

---

## Stack

- HTML5, CSS3 e JavaScript puro, sem frameworks
- SVG vetorial para símbolos e divisores
- [Lato](https://fonts.google.com/specimen/Lato) via Google Fonts
- [Font Awesome 6](https://fontawesome.com/) para ícones
- Service Worker para funcionamento offline
- Web App Manifest para instalação como PWA
- Vibration API para haptic feedback

---

## Estrutura do projeto

```
lore-counter/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── sw.js
└── assets/
    ├── background.jpg
    ├── exception.png
    ├── divider.svg
    ├── DLC_Logo_Medium_RGB.png
    └── losango_alongado_illuminary_gold.svg
```

---

*Projeto não oficial. Disney Lorcana é propriedade da The Walt Disney Company / Ravensburger.*
