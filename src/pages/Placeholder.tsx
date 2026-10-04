import { Link } from "react-router-dom";
import { EmptyState, PageHeading } from "../components/ui";
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Espaço de trabalho"
        title={title}
        description="Esta interface está em preparação."
      />
      <section className="panel">
        <EmptyState title="Estamos organizando esta área">
          <p>
            As telas disponíveis nesta versão são visão geral, produtos e venda
            rápida.
          </p>
          <Link to="/" className="btn secondary">
            Voltar ao início
          </Link>
        </EmptyState>
      </section>
    </div>
  );
}
