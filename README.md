# ✦ Lorcana Lore Counter

> Contador de Lore para **Disney Lorcana** — PWA para dois jogadores, com visual temático e haptic feedback.

🔗 **[Abrir o app](https://vomoura.github.io/lore-counter/)**

---

## Funcionalidades

- **Dois jogadores** — tela dividida, com o Jogador 2 invertido para jogar frente a frente
- **Símbolo de Lore** oficial do Disney Lorcana em SVG vetorial com gradiente Illuminary Gold
- **Botões +/−** para incremento e decremento do contador (0–20)
- **Dial horizontal** — arraste para ajustar o valor com precisão, como um dial de rádio
- **Haptic feedback** — vibração a cada tick do dial e ao pressionar botões (dispositivos Android)
- **Fim de jogo** — ao atingir 20 lore, a tela escurece, o vencedor é destacado e um botão de fim de jogo aparece
- **Modal de parabéns** — exibe o jogador vencedor com opção de iniciar novo jogo
- **Efeito de carta** — suporte ao efeito do *Donald Duck - Flustered Sorcerer*, que eleva o limite de lore do oponente para 25

## Efeito do Card

O botão ✦ centralizado na linha divisória abre o painel de exceção. Ao selecionar qual jogador possui o *Donald Duck - Flustered Sorcerer* em jogo, o oponente desse jogador precisará de **25 lore** para vencer. O efeito persiste até o início de um novo jogo ou até ser desmarcado manualmente.

---

## Visual

| Cor | Nome | Hex |
|-----|------|-----|
| ![#373B70](https://placehold.co/16x16/373B70/373B70.png) | Lorcana Indigo | `#373B70` |
| ![#D3BA84](https://placehold.co/16x16/D3BA84/D3BA84.png) | Illuminary Gold | `#D3BA84` |
| ![#E3CAA8](https://placehold.co/16x16/E3CAA8/E3CAA8.png) | Parchment | `#E3CAA8` |
| ![#1C1C1A](https://placehold.co/16x16/1C1C1A/1C1C1A.png) | Kelp | `#1C1C1A` |

---

## Instalação como PWA

1. Acesse **[https://vomoura.github.io/lore-counter/](https://vomoura.github.io/lore-counter/)** no Chrome Android
2. Toque no menu `⋮` → **"Adicionar à tela inicial"**
3. O app abre em tela cheia, sem barra do navegador

---

## Tecnologias

- HTML5 + CSS3 + JavaScript puro — sem frameworks
- SVG inline para o símbolo de Lore
- [Lato](https://fonts.google.com/specimen/Lato) via Google Fonts
- [Font Awesome 6](https://fontawesome.com/) para ícones
- Service Worker para funcionamento offline
- Web App Manifest para instalação como PWA
- Vibration API para haptic feedback

---

## Estrutura

```
lore-counter/
├── index.html        # Estrutura e layout
├── style.css         # Estilos e animações
├── app.js            # Lógica do contador, dial e modais
├── manifest.json     # Configuração PWA
├── sw.js             # Service Worker (cache offline)
└── assets/
    ├── background.jpg                        # Background nebulosa
    ├── exception.jpg                         # Carta Donald Duck
    └── losango_alongado_illuminary_gold.svg  # Símbolo de Lore
```

---

*Projeto não oficial. Disney Lorcana é propriedade da The Walt Disney Company / Ravensburger.*
