import type { AppContext } from "../../mod.ts";
import { getUserCookie } from "../../utils/user.ts";
import { Wishlist } from "../../utils/client/types.ts";
import wishlistLoader from "../../loaders/wishlist.ts";
import { SESSION_COOKIE } from "../../utils/constants.ts";
export interface Props {
  productId: string;
}
/**
 * @title Magento Integration - Add item to Wishlist
 * @description Add to wishlist action
 */
const action = async (
  { productId }: Props,
  req: Request,
  ctx: AppContext,
): Promise<Wishlist | null> => {
  try {
    const { clientAdmin, site } = ctx;
    const id = getUserCookie(req.headers);
    const headers = new Headers({ Cookie: `${SESSION_COOKIE}=${id}` });
    const { success } = await clientAdmin["POST /:site/wishlist/index/add/"]({
      site,
    }, {
      body: { product: productId },
      headers,
    }).then((res) => res.json());
    if (success) return wishlistLoader(null, req, ctx);
    return null;
  } catch (_error) {
    return null;
  }
};

export default action;