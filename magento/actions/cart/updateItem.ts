import cart, { Cart } from "../../loaders/cart.ts";
import { AppContext } from "../../mod.ts";
import { getCartCookie, handleCartError } from "../../utils/cart.ts";

export interface Props {
  qty: number;
  itemId: string;
  sku: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext
): Promise<Cart | null> => {
  const { qty, itemId, sku } = props;
  const { clientAdmin } = ctx;
  const cartId = getCartCookie(req.headers);

  const body = {
    cartItem: {
      qty: qty,
      quote_id: cartId,
      sku: sku,
    },
  };

  try {
    await clientAdmin["PUT /rest/:site/V1/carts/:cartId/items/:itemId"](
      {
        itemId,
        cartId: cartId,
        site: ctx.site,
      },
      { body }
    );
  } catch (error) {
    return {
      ...(await cart(undefined, req, ctx)),
      ...handleCartError(error),
    };
  }

  return await cart(undefined, req, ctx);
};

export default action;