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
