import { logger } from "deco/mod.ts";
import { AppContext } from "../mod.ts";
import { getCartCookie, toCartItemsWithImages } from "../utils/cart.ts";
import { Cart as CartFromDeco } from "../utils/client/types.ts";
import {
  BASE_CURRENCY_CODE,
  BASE_DISCOUNT_AMOUNT,
  BASE_SHIPPING_AMOUNT,
  COUPON_CODE,
  DISCOUNT_AMOUNT,
  GRAND_TOTAL,
  SHIPPING_AMOUNT,
  SHIPPING_DISCOUNT_AMOUNT,
  SUBTOTAL,
} from "../utils/constants.ts";
import {
  ProductImagesInputs,
  ProductWithImagesGraphQL,
} from "../utils/clientGraphql/types.ts";
import { GetProductImages } from "../utils/clientGraphql/queries.ts";

export type Cart = CartFromDeco;

interface Props {
  cartId?: string;
}

/**
 * @title Magento Integration - Cart
 * @description Cart loader
 */
const loader = async (
  { cartId: _cartId }: Props = { cartId: undefined },
  req: Request,
  ctx: AppContext,
): Promise<Cart | null> => {
  const { clientAdmin, site, imagesUrl, cartConfigs, clientGraphql } = ctx;
  const { countProductImageInCart } = cartConfigs;
  const url = new URL(req.url);
  const cartId = _cartId ?? getCartCookie(req.headers);

  if (!cartId) return null;
  logger.info(
    `URL: ${url}, CartID: ${cartId}, CTX-HEADER: ${
      JSON.stringify(ctx.response.headers).toString
    }, REQ-Header: ${JSON.stringify(req.headers).toString}`,
  );
  const [resultPricesCarts, resultCart] = await Promise.all([
    clientAdmin["GET /rest/:site/V1/carts/:cartId/totals"]({
      cartId,
      site,
      fields: [
        GRAND_TOTAL,
        SUBTOTAL,
        DISCOUNT_AMOUNT,
        BASE_DISCOUNT_AMOUNT,
        SHIPPING_AMOUNT,
        BASE_SHIPPING_AMOUNT,
        SHIPPING_DISCOUNT_AMOUNT,
        COUPON_CODE,
        BASE_CURRENCY_CODE,
      ].join(","),
    }),
    clientAdmin["GET /rest/:site/V1/carts/:cartId"]({
      cartId,
      site,
    }),
  ]);

  const cart = await resultCart.json();
  const prices = await resultPricesCarts.json();

  const { products } = await clientGraphql.query<
    ProductWithImagesGraphQL,
    ProductImagesInputs
  >(
    {
      variables: {
        filter: { sku: { in: cart.items.map(({ sku }) => sku) } },
        pageSize: cart.items.length,
      },
      ...GetProductImages,
    },
  );

  return toCartItemsWithImages(
    cart,
    prices,
    products,
    imagesUrl,
    url.origin,
    site,
    countProductImageInCart,
  );
};
export default loader;
