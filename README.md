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

Atualize primeiro o backend para a branch `feat/catalog-inventory`. Depois, nesta pasta:

```bash
git fetch origin
git switch feat/catalog-inventory
git pull --ff-only origin feat/catalog-inventory
npm ci
npm run dev
```

Esta branch inclui a interface anterior (`feat/erp-interface`) mais as novas funcionalidades. Nenhum reset, seed ou migration é necessário. Mantenha seu `.env` atual e o PostgreSQL existente. Use Node.js 24 para a suíte atual.

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
- Busca e paginação locais (10 registros por página), estados vazios, falhas recuperáveis e tratamento de 401/403.

## Validação

```bash
npm run build
npm run lint
npm test
```

Os testes de componentes usam respostas simuladas compatíveis com os contratos do backend. Não dependem de banco ou credenciais e não alteram dados reais. Eles cobrem formulários, payloads numéricos, permissões, vendas, compras, relatórios, paginação e navegação.

## Limites conhecidos

- Esta versão exige a branch `feat/catalog-inventory` do backend para edição/status de produtos e relatório de reposição.
- Exclusão definitiva e redefinição de senha não foram incluídas.
- O plano de reposição não prevê demanda futura nem cria compras automaticamente. O custo estimado exclui frete e impostos.
- O backend exige pelo menos uma permissão por função ao atualizar permissões.
- A autorização final permanece no backend. O login atual não retorna a lista de permissões individuais; tentativas sem acesso recebem mensagem de permissão insuficiente.
- Listagens e indicadores abrangem todo o período. Filtros de data e paginação no servidor ainda não estão disponíveis.
- A confirmação de compras segue o fluxo da API: criar pedido, adicionar itens, receber. Um pedido permanece pendente até o recebimento.
- Validação visual em navegador real e integração com PostgreSQL real ainda precisam ser realizadas. A instalação do navegador de testes foi bloqueada por erro de certificado no ambiente desta atualização.
