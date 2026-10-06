-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "option" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "optionLabel" TEXT NOT NULL DEFAULT 'Size',
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];
