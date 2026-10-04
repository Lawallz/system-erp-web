export type Category = { id: string; name: string };
export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: string | number;
  costPrice: string | number;
  stockQuantity: number;
  minStockAlert: number;
  categoryId: string;
  category: Category;
  isActive: boolean;
};
export type ProductPage = {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type ProductInput = {
  name: string;
  sku: string;
  description: string;
  price: number;
  costPrice: number;
  categoryId: string;
  minStockAlert: number;
};
