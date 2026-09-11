import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerProductForm from "@/components/partners/SellerProductForm";

export default async function EditPartnerProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = ADMIN_ROLES.includes(session!.user.role);

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  if (!isAdmin && product.sellerId !== session!.user.id) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit listing</h1>
      <SellerProductForm product={product} />
    </div>
  );
}
