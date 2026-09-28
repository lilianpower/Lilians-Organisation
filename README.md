# Organizar

Uma app simples para o telemóvel: escreves qualquer coisa e ela organiza sozinha em
**Tarefas, Compromissos, Compras, Ideias e Notas**. Funciona sem internet e pode ser
instalada no ecrã principal como uma app normal.

*A simple phone app: type anything and it sorts it into Tasks, Appointments, Shopping,
Ideas and Notes. Works offline and installs to the home screen like a normal app.*

---

## Como usar / How to use

- Escreve e carrega em **Adicionar** (ou Enter). / Type and tap **Adicionar** (or Enter).
- Palavras como *comprar, leite, buy* → 🛒 Compras. *Dentista, reunião, meeting* → 📅 Compromissos.
  *Ligar, pagar, call, pay* → ✅ Tarefas. *Ideia, talvez, idea, maybe* → 💡 Ideias. O resto → 📝 Notas.
- Datas como *hoje, amanhã, sexta, 12/10, tomorrow, friday* aparecem como data e ordenam a lista.
- Para escolher a categoria tu mesma, começa com `#compras`, `#tarefas`, `#ideias`, etc.
- Toca na etiqueta da categoria de um item para o mudar de categoria.
- **Guardar cópia** descarrega um ficheiro de backup; **Restaurar cópia** junta esse ficheiro de volta.

---

## Passo a passo: pôr a app online com o Netlify

*Step by step: putting the app online with Netlify.*

Tu já tens a parte do GitHub feita: o código vive aqui neste repositório.
O Netlify vai ler este repositório e transformá-lo num site com um link.
*You already have the GitHub part: the code lives in this repo. Netlify reads it and turns it into a website with a link.*

1. Abre **https://app.netlify.com/signup** no telemóvel.
   Escolhe **"Sign up with GitHub"** e entra com a tua conta GitHub (lilianpower).
   *Open the link, choose "Sign up with GitHub", log in with your GitHub account.*
2. Se perguntar coisas sobre ti (nome da equipa, para que é), responde o que quiseres — escolhe o plano **gratuito / Free**.
   *Answer the welcome questions however you like; pick the Free plan.*
3. Carrega em **"Add new project"** (ou "Add new site") → **"Import an existing project"**.
4. Escolhe **GitHub**. Se pedir autorização, aceita e dá acesso ao repositório **Lilians-Organisation**.
   *Choose GitHub, authorize it, and give it access to the Lilians-Organisation repo.*
5. Seleciona o repositório **Lilians-Organisation**.
6. Em **Branch to deploy**, escolhe o branch onde está a app
   (enquanto não juntarmos ao principal é `claude/offline-app-netlify-github-xxgagr`).
   Deixa o resto como está — já está tudo no ficheiro `netlify.toml`.
   *Pick the branch with the app; leave the rest as is.*
7. Carrega em **Deploy**. Espera ~30 segundos. Vais receber um link tipo
   `https://nome-aleatorio.netlify.app`.
   *Tap Deploy, wait ~30 seconds, you get a link.*
8. (Opcional) Em **Site configuration → Change site name** podes mudar para algo tipo
   `lilian-organiza.netlify.app`.

A partir de agora, **sempre que o Claude fizer alterações e as enviar para o GitHub, o
Netlify atualiza o site sozinho**. Não precisas de fazer mais nada.
*From now on, every change pushed to GitHub updates the site automatically.*

## Instalar no ecrã principal / Install on the home screen

- **iPhone (Safari):** abre o link → botão **Partilhar** ⬆️ → **Adicionar ao ecrã principal**.
- **Android (Chrome):** abre o link → aparece o botão **Instalar** no topo da app
  (ou menu ⋮ → **Instalar app / Adicionar ao ecrã principal**).

Depois de abrir uma vez com internet, a app funciona **sem internet**.
*After opening once online, it works offline.*

## Sincronização / Sync

1. Na app, toca em **🔄** (canto de cima) → **Criar lista partilhada**.
2. Toca em **Enviar convite** e manda a mensagem à outra pessoa.
3. A outra pessoa instala a app, toca em **🔄**, cola o **código** e carrega em **Juntar**.

A partir daí, o que um escreve aparece no outro. Sem internet continua a funcionar e
junta tudo quando a ligação volta. O código funciona como uma palavra-passe: só o
partilhes com quem deve ver a lista.

*Tap 🔄 → Create shared list → Send invite. The other person installs the app, taps 🔄,
pastes the code and taps Join. Works offline and merges when back online. The code
works like a password — only share it with people who should see the list.*

A app segue a língua do telemóvel (português ou inglês) e o modo claro/escuro.
*The app follows the phone's language (Portuguese or English) and light/dark mode.*
