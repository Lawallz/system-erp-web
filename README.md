# MiniERP — interface de gestão

Frontend React + TypeScript para [system-erp](https://github.com/Lawallz/system-erp).

## Executar

```bash
npm ci
npm run dev
```

Inicie o backend na porta 3333. O Vite encaminha `/api` para `http://localhost:3333`. Faça login com um usuário existente no banco; nenhum acesso é preenchido automaticamente.

Para outro servidor, copie `.env.example` para `.env.local` e defina `VITE_API_URL` com a URL completa, incluindo `/api`. Variáveis `VITE_*` são públicas: nunca inclua senhas ou segredos. Em produção, configure também CORS no backend e o fallback do servidor web para `index.html` nas rotas do frontend.

## Atualizar uma instalação existente

Atualize primeiro o backend para a branch `feat/sales-workspace`. Depois, nesta pasta:

```bash
git fetch origin
git switch feat/sales-workspace
git pull --ff-only origin feat/sales-workspace
npm ci
npm run dev
```

Esta branch inclui a interface anterior (`feat/erp-interface`) mais as novas funcionalidades. Aplique primeiro a migration de código de barras no backend com `npx prisma migrate deploy`. Não rode reset ou seed. Mantenha seu `.env` atual e o PostgreSQL existente. Use Node.js 24 para a suíte atual.

## Funcionalidades

- Layout responsivo com navegação no celular, foco visível e diálogos nativos.
- Dashboard: receita, vendas, ticket médio, produtos ativos, ranking por quantidade, alertas e últimas vendas.
- Produtos: criação e edição com categorias, custos, preços e mínimo; filtros por status, categoria e saldo; margem bruta estimada; desativação e reativação com confirmação.
- Categorias, fornecedores, usuários e funções: criação e edição. Usuários e fornecedores também podem ser ativados/desativados.
- Funções: consulta e atualização das permissões existentes.
- Estoque: histórico e registro de ajustes, devoluções e perdas.
- Reposição: valorização a custo e preço de venda, sugestão até o mínimo descontando compras pendentes, filtros e exportação do plano filtrado em CSV.
- Vendas: múltiplos produtos, total estimado, confirmação e detalhes. O backend determina os preços finais e baixa o estoque.
- Compras: criação de pedido pendente, adição de itens e confirmação de recebimento com entrada no estoque.
- Relatórios: vendas, estoque, produtos sem movimentação e curva ABC; exportação da tabela exibida em CSV com proteção contra fórmulas.
- Busca, datas de cadastro e paginação no servidor (10, 20 ou 50 por página) em produtos, categorias, fornecedores, usuários, funções, vendas, compras e movimentações. Filtros e datas de exibição usam UTC−03. Indicadores, relatórios e plano de reposição mantêm seus contratos agregados e filtros locais.
- Venda rápida em `/sales/new`: busca por nome/SKU/código de barras, scanner USB que envia Enter, carrinho com controle de saldo e confirmação; F2 busca e F4 revisa. A busca exata preserva zeros à esquerda e informa códigos ambíguos.
- Código de barras opcional e único no cadastro de produtos; detalhes do produto com abas de movimentações, compras e vendas, filtros e paginação independentes.
- Menus, atalhos, rotas e ações conforme permissões retornadas por `/auth/me`. Permissões são revalidadas ao focar a janela, após alterações de cadastros e respostas 403.

## Validação

```bash
npm run build
npm run lint
npm test
```

Os testes de componentes usam respostas simuladas compatíveis com os contratos do backend. Não dependem de banco ou credenciais e não alteram dados reais. Eles cobrem formulários, payloads numéricos, permissões, vendas, compras, relatórios, paginação e navegação.

## Limites conhecidos

- Esta versão exige a branch `feat/sales-workspace` do backend para edição/status de produtos e relatório de reposição.
- Exclusão definitiva e redefinição de senha não foram incluídas.
- O plano de reposição não prevê demanda futura nem cria compras automaticamente. O custo estimado exclui frete e impostos.
- O backend exige pelo menos uma permissão por função ao atualizar permissões.
- A autorização final permanece no backend. Operadores com apenas `sales:create` usam o catálogo de venda sem obter custos ou acesso administrativo. Históricos do produto exigem `products:read` e a permissão de leitura do módulo correspondente.
- O carrinho existe apenas na tela atual e não processa pagamentos. Não há leitura por câmera. Em falhas de conexão após confirmar, confira o histórico antes de repetir: a API ainda não oferece chave de idempotência.
- Os seletores de formulários e relatórios agregados preservam endpoints legados sem paginação; grandes volumes nesses fluxos ainda precisam de evolução específica.
- Formulários de compra/estoque e usuários precisam também das permissões de leitura dos cadastros usados em seus seletores.
- A confirmação de compras segue o fluxo da API: criar pedido, adicionar itens, receber. Um pedido permanece pendente até o recebimento.
- Validação visual em navegador real e integração com PostgreSQL real ainda precisam ser realizadas. A instalação do navegador de testes foi bloqueada por erro de certificado no ambiente desta atualização.
