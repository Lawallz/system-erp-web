# MiniERP — interface de gestão

Frontend React + TypeScript para [system-erp](https://github.com/Lawallz/system-erp).

## Executar

```bash
npm ci
npm run dev
```

Inicie o backend na porta 3333. O Vite encaminha `/api` para `http://localhost:3333`. Faça login com um usuário existente no banco; nenhum acesso é preenchido automaticamente.

Para outro servidor, copie `.env.example` para `.env.local` e defina `VITE_API_URL` com a URL completa, incluindo `/api`. Variáveis `VITE_*` são públicas: nunca inclua senhas ou segredos. Em produção, configure também CORS no backend e o fallback do servidor web para `index.html` nas rotas do frontend.

## Funcionalidades

- Layout responsivo com navegação no celular, foco visível e diálogos nativos.
- Dashboard: receita, vendas, ticket médio, produtos ativos, ranking por quantidade, alertas e últimas vendas.
- Produtos: listagem, busca e criação com categorias, custos, preços e estoque mínimo.
- Categorias, fornecedores, usuários e funções: criação e edição.
- Funções: consulta e atualização das permissões existentes.
- Estoque: histórico e registro de ajustes, devoluções e perdas.
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

- Esta atualização modifica somente o frontend e mantém os contratos existentes do backend.
- A API de produtos atual oferece criação e listagem, mas não edição; a interface não apresenta edição de produtos.
- Exclusão, ativação/desativação e redefinição de senha não foram incluídas nesta etapa.
- O backend exige pelo menos uma permissão por função ao atualizar permissões.
- A autorização final permanece no backend. O login atual não retorna a lista de permissões individuais; tentativas sem acesso recebem mensagem de permissão insuficiente.
- Listagens e indicadores abrangem todo o período. Filtros de data e paginação no servidor ainda não estão disponíveis.
- A confirmação de compras segue o fluxo da API: criar pedido, adicionar itens, receber. Um pedido permanece pendente até o recebimento.
- Validação visual em navegador real e integração com PostgreSQL real ainda precisam ser realizadas. O navegador automatizado não iniciou no ambiente usado para esta atualização.
