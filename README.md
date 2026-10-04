# MiniERP — Interface web

Frontend do MiniERP construído com React, TypeScript, Vite, Tailwind CSS, Axios e React Router.

A API fica no repositório [system-erp](https://github.com/Lawallz/system-erp).

## Executar localmente

1. Configure e inicie o backend na porta `3333`, seguindo o README da API.
2. Com Node.js compatível com Vite 8 instalado, execute:

```bash
git clone https://github.com/Lawallz/system-erp-web.git
cd system-erp-web
npm ci
npm run dev
```

Abra o endereço informado pelo Vite no terminal.

## Comunicação com a API

O cliente em [src/api/http.ts](src/api/http.ts) usa a base relativa `/api`. Durante o desenvolvimento, [vite.config.ts](vite.config.ts) encaminha essas chamadas para `http://localhost:3333`.

Quando existe uma sessão, o interceptor adiciona o token armazenado em `erp_token` ao cabeçalho `Authorization: Bearer ...`.

O proxy de desenvolvimento não configura a hospedagem de produção. Nesse ambiente, é necessário encaminhar `/api` ao backend na mesma origem ou adaptar a configuração do cliente.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Iniciar o Vite |
| `npm run lint` | Executar Oxlint |
| `npm run build` | Verificar TypeScript e gerar o build |
| `npm run preview` | Inspecionar o build localmente |

## Estrutura

- `src/pages/`: páginas, incluindo Login, Dashboard e Placeholder.
- `src/contexts/`: contextos da aplicação.
- `src/layouts/`: estrutura visual.
- `src/routes/`: organização das rotas.
- `src/api/`: cliente HTTP.

## Diagnóstico rápido

Se as chamadas a `/api` falharem, confirme que o backend está rodando na porta `3333`. Respostas `401` devem ser investigadas verificando a sessão e o token; respostas `403` indicam que também é necessário conferir as permissões no backend.

## Workspace de produtos e vendas

Esta versão utiliza o backend atualizado de [system-erp](https://github.com/Lawallz/system-erp), incluindo `/api/auth/me`, permissões de sessão, paginação de produtos e edição por `PUT`. Atualize e inicie a API antes do frontend.

### Recursos disponíveis

- Dashboard com indicadores reais, ranking de produtos, avisos de estoque e atualização manual.
- Catálogo com busca por nome/SKU, filtro por categoria e paginação no servidor.
- Cadastro e edição de produtos, além de criação de categoria dentro do formulário.
- Venda rápida com carrinho, controle de quantidade, revisão antes da confirmação e comprovante com o identificador retornado pela API.
- Menu responsivo e ações condicionadas às permissões. A API continua sendo responsável pela autorização efetiva.
- Estados de carregamento, erro, lista vazia e sucesso, foco visível e suporte a movimento reduzido.

As demais áreas continuam sinalizadas como **Em breve**. Esta entrega não adiciona pagamento, emissão fiscal nem cancelamento de venda.

### Atalhos e leitor

| Ação | Atalho |
| --- | --- |
| Focar a busca na venda rápida | `F2` |
| Abrir a revisão do carrinho | `Ctrl + Enter` |
| Adicionar um SKU exato digitado/lido | `Enter` no campo de busca |
| Fechar janela de edição/revisão | `Escape`, quando não houver envio em andamento |

O leitor deve funcionar como teclado e enviar um código que corresponda ao **SKU** cadastrado. Não há campo EAN separado nem leitura por câmera.

### Carrinho e envio

O rascunho é mantido em `sessionStorage`, separado por usuário, durante a sessão da aba. Ele permite navegar entre as telas e retornar à venda; não é um pedido registrado. Os preços e saldos exibidos podem ficar desatualizados, por isso a API confirma os valores vigentes ao finalizar.

Em caso de resposta incerta da rede, o sistema bloqueia o reenvio automático. Confira os registros antes de liberar uma nova tentativa para evitar duplicidade. Não há garantia de idempotência entre diferentes abas ou dispositivos.

### Visual e acessibilidade

O workspace usa CSS para transições curtas e elementos decorativos leves, sem dependência de GSAP ou Three.js. A preferência `prefers-reduced-motion` desativa os movimentos. As janelas de edição e confirmação utilizam o elemento nativo `dialog`.
