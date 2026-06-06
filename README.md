# Lorcana Lore Counter

Contador de Lore para **Disney Lorcana**, feito como PWA para dois jogadores com visual temático, haptic feedback e um dial de precisão.

🔗 **[Abrir o app](https://vomoura.github.io/lore-counter/)**

---

## O que o app faz

A tela é dividida ao meio: cada jogador tem seu próprio espaço com o símbolo de Lore, contador, botões e slider. O Jogador 2 fica invertido no topo para que os dois possam jogar frente a frente com o celular entre eles.

### Contador
Os botões **+** e **-** incrementam e decrementam o lore entre 0 e 20. O dial horizontal é o diferencial: deslize o dedo para ajustar o valor com precisão, como um dial de rádio, com vibração a cada tick.

### Fim de jogo
Quando um jogador chega a 20 lore, a tela escurece, o vencedor é destacado com glow e um botão **FIM DO JOGO** aparece sobre o divisor. Ao clicar, um modal exibe o vencedor e oferece a opção de iniciar um novo jogo.

---

## Menu de ações

O botão hamburguer no lado direito do divisor expande em animação circular e exibe quatro botões:

### Cronômetro
Inicia uma rodada cronometrada com seletor de duração (30 a 60 minutos) e modo **MD1** ou **MD3**. O timer aparece no lado esquerdo do divisor como um círculo que vai drenando no sentido horário conforme o tempo passa. Ao chegar em cada terço do tempo, o app vibra para avisar os jogadores. No último terço o arco muda de cor. Ao zerar, o app vibra por 3 segundos e abre o modal de Turnos Extras.

**Turnos Extras:** 5 rodadas extras para desempate. Cada clique no círculo decrementa o contador. Ao chegar em zero, o vencedor é determinado pela ordem de prioridade: mais vitórias no MD3, depois maior lore, depois sudden death (o próximo a ter mais lore vence imediatamente).

### Reiniciar Jogo
Permite zerar os contadores ou registrar uma concessão de jogador. Ao selecionar um jogador que concedeu, exibe confirmação antes de declarar o vencedor. Inclui a opção **Empatar**, que distribui 1 pip para cada jogador e encerra a rodada.

### Histórico
Exibe o log de alterações de lore da partida atual. Inputs consecutivos com menos de 2 segundos de intervalo são consolidados em um único registro. Cada entrada mostra o jogador, o delta acumulado e o placar antes e depois.

### Efeito do Card
Suporte ao efeito do *Donald Duck - Flustered Sorcerer*. Ao marcar qual jogador possui a carta, o oponente precisará de **25 lore** para vencer. O efeito persiste até o início de um novo jogo ou até ser desmarcado manualmente.

---

## MD1 e MD3

Ao iniciar uma rodada com o cronômetro, escolha entre **Melhor de 1** (MD1) ou **Melhor de 3** (MD3). Pips de vitória aparecem ao lado do nome de cada jogador e são preenchidos conforme as vitórias acumuladas. Em MD3, ao vencer 2 jogos, o app abre o modal de nova rodada automaticamente.

---

## Efeitos visuais

Ao ganhar um jogo, o símbolo do vencedor recebe um glow intenso. O cronômetro pulsa em dourado a cada terço do tempo e muda de cor no último terço. Todos os modais usam a paleta oficial do Lorcana.

---

## Instalação como PWA

**Android (Chrome)**
1. Acesse [https://vomoura.github.io/lore-counter/](https://vomoura.github.io/lore-counter/)
2. Toque no menu e depois em **Adicionar à tela inicial**

**iOS (Safari)**
1. Acesse o link acima
2. Toque em **Compartilhar** e depois em **Adicionar à Tela de Início**

O app funciona completamente offline após a primeira abertura com internet.

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
- SVG vetorial para símbolos, divisores e o anel do cronômetro
- [Lato](https://fonts.google.com/specimen/Lato) e [Font Awesome 6](https://fontawesome.com/) hospedados localmente para uso offline
- Service Worker com stale-while-revalidate para funcionamento offline completo
- Web App Manifest para instalação como PWA
- Vibration API para haptic feedback
- Screen Wake Lock API para manter a tela ligada durante a partida

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
    ├── losango_alongado_illuminary_gold.svg
    ├── lato.css + lato-*.ttf
    ├── fa.css
    └── webfonts/
```

---

*Projeto não oficial. Disney Lorcana é propriedade da The Walt Disney Company / Ravensburger.*
