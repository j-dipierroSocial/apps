import { getCookies } from "std/http/cookie.ts";
import { AppContext } from "../mod.ts";
import { Cart, MagentoCardPrices, MagentoProduct } from "./client/types.ts";
import { toURL } from "./transform.ts";
import { ImageObject } from "../../commerce/types.ts";

const CART_COOKIE = "dataservices_cart_id";
const CART_CUSTOMER_COOKIE = "dataservices_customer_id";

const ONE_WEEK_MS = 7 * 24 * 3600 * 1_000;

export const getCartCookie = (headers: Headers): string => {
  const cookies = getCookies(headers);
  return decodeURIComponent(cookies[CART_COOKIE] || "").replace(/"/g, "");
};

export const setCartCookie = (headers: Headers, cartId: string) => {
  const encodedCartId = encodeURIComponent(`"${cartId}"`);
  const cookie = `${CART_COOKIE}=${encodedCartId}; Path=/; Expires=${
    new Date(Date.now() + ONE_WEEK_MS).toUTCString()
  }; SameSite=Lax`;
  headers.append("Set-Cookie", cookie);
};

export async function createCart(
  { clientAdmin, site }: AppContext,
  headers: Headers,
) {
  const cartCookie = getCookies(headers)[CART_COOKIE];

  const customerCookie = getCookies(headers)[CART_CUSTOMER_COOKIE];

  if (!cartCookie && !customerCookie) {
    const tokenCart = await clientAdmin["POST /rest/:site/V1/guest-carts"]({
      site,
    }).then((res) => res.json());
    const cart = await clientAdmin["GET /rest/:site/V1/guest-carts/:cartId"]({
      cartId: tokenCart,
      site,
    }).then((res) => res.json());
    return await clientAdmin["GET /rest/:site/V1/carts/:cartId"]({
      cartId: cart.id,
      site,
    }).then((res) => res.json());
  } else {
    return await clientAdmin["GET /rest/:site/V1/carts/:cartId"]({
      cartId: cartCookie,
      site,
    }).then((res) => res.json());
  }
}

export const toCartItemsWithImages = (
  cart: Cart,
  prices: MagentoCardPrices,
  productMagento: MagentoProduct[],
  imagesUrl: string,
  url: string,
  site: string,
) => {
  const productImagesMap = productMagento.reduce((map, productImage) => {
    map[productImage.sku] = productImage || [];
    return map;
  }, {} as Record<string, MagentoProduct>);

  const itemsWithImages = cart.items.map((product) => {
    const images = productImagesMap[product.sku].media_gallery_entries;
    const productData = productImagesMap[product.sku];
    const firstImage = images?.[0]
      ? {
        "@type": "ImageObject" as const,
        encodingFormat: "image",
        alternateName: images[0].file,
        url: `${toURL(imagesUrl)}${images[0].file}`,
      } as ImageObject
      : null;

    const urlKey = productData.custom_attributes.find((item) =>
      item.attribute_code === "url_key"
    )?.value;

    return {
      ...product,
      price_total: product.qty * product.price,
      images: firstImage ? [firstImage] : [],
      url: `${url}/${site}/${urlKey}`,
    };
  });

  return {
    ...cart,
    items: itemsWithImages,
    totalizers: {
      grand_total: prices.grand_total,
      subtotal: prices.subtotal,
      discount_amount: prices.discount_amount,
      shipping_amount: prices.shipping_amount,
      shipping_discount_amount: prices.shipping_discount_amount,
      base_currency_code: prices?.base_currency_code,
      base_discount_amount: prices.base_discount_amount,
      base_shipping_amount: prices.base_shipping_amount,
      base_subtotal: prices.base_subtotal,
      coupon_code: prices.coupon_code,
    },
  };
};
