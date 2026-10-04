import axios from "axios";
const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const currency = (value: number | string) =>
  formatter.format(Number(value));
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "Sua sessão expirou. Entre novamente.";
    if (error.response?.status === 403)
      return "Você não tem permissão para esta operação.";
    return (
      error.response?.data?.message ||
      "Não foi possível conectar à API. Confira a conexão e tente novamente."
    );
  }
  return "Não foi possível concluir. Tente novamente.";
}
