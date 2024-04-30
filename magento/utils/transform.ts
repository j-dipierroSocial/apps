import {
  ListItem,
  Offer,
  Product,
  PropertyValue,
} from "../../commerce/types.ts";
import { MagentoCategory, MagentoProduct } from "./client/types.ts";
import { IN_STOCK, OUT_OF_STOCK } from "./constants.ts";

export const parseSlug = (slug: string) => {
  const segments = slug.split("-");
  const id = Number(segments.at(-1));

  if (!id) {
    throw new Error("Malformed slug. Expecting {slug}-{id} format");
  }

  return {
    slug: segments.slice(0, -1).join("-"),
    id: Number(segments.at(-1)),
  };
};

export const toProduct = (
  { product, options }: {
    product: MagentoProduct;
    options: { currencyCode?: string; imagesUrl?: string };
  },
): Product => {
  const offers = toOffer(product);
  const sku = product.sku;
  const productID = product.id.toString();
  const productPrice = product.price_info;

  const additionalProperty: PropertyValue[] = product.custom_attributes?.map((
    attr,
  ) => ({
    "@type": "PropertyValue",
    name: attr.attribute_code,
    value: String(attr.value),
  }));

  return {
    "@type": "Product",
    productID,
    sku,
    url: product.url,
    name: product.name,
    gtin: sku,
    isVariantOf: {
      "@type": "ProductGroup",
      productGroupID: productID,
      url: product.url,
      name: product.name,
      model: "",
      additionalProperty: additionalProperty,
      hasVariant: [
        {
          "@type": "Product",
          productID,
          sku,
          url: product.url,
          name: product.name,
          gtin: sku,
          offers: {
            "@type": "AggregateOffer",
            highPrice: productPrice?.max_price ?? product.price!,
            lowPrice: productPrice?.minimal_price ?? product.price!,
            offerCount: offers.length,
            offers: offers,
          },
        },
      ],
    },
    additionalProperty: additionalProperty,
    image: toImages(product, options.imagesUrl ?? ""),
    offers: {
      "@type": "AggregateOffer",
      highPrice: productPrice?.max_price ?? product.price!,
      lowPrice: productPrice?.minimal_price ?? product.price!,
      offerCount: offers.length,
      offers: offers,
    },
  };
};

export const toOffer = (
  { price_info, extension_attributes, sku, currency_code }: MagentoProduct,
): Offer[] => {
  if (!price_info) {
    return [];
  }
  const { final_price } = price_info;
  const { stock_item } = extension_attributes;

  const offer: Offer = {
    "@type": "Offer",
    availability: stock_item?.is_in_stock ? IN_STOCK : OUT_OF_STOCK,
    inventoryLevel: {
      value: stock_item?.qty ?? 0,
    },
    itemCondition: "https://schema.org/NewCondition",
    price: final_price,
    priceCurrency: currency_code,
    priceSpecification: [],
    sku: sku,
  };
  return [offer];
};

export const toImages = (product: MagentoProduct, imageUrl: string) => {
  if (imageUrl) {
    return product.media_gallery_entries?.map((img) => ({
      "@type": "ImageObject" as const,
      encodingFormat: "image",
      alternateName: `${img.file}`,
      url: `${toURL(imageUrl)}${img.file}`,
    }));
  }

  return product.images?.map((img) => ({
    "@type": "ImageObject" as const,
    encodingFormat: "image",
    alternateName: `${img.label}`,
    url: `${img.url}`,
  }));
};

export const toURL = (src: string) =>
  src.startsWith("//") ? `https:${src}` : src;

export const toBreadcrumbList = (
  categories: (MagentoCategory | null)[],
  isBreadcrumbProductName: boolean,
  product: Product,
  url: URL,
) => {
  if (isBreadcrumbProductName && categories?.length === 0) {
    return [
      {
        "@type": "ListItem",
        name: product.name,
        position: 1,
        item: new URL(`/${product.name}`, url).href,
      },
    ];
  }

  const itemListElement = categories.map((category) => {
    if (!category || !category.name || !category.position) {
      return null;
    }
    return {
      "@type": "ListItem",
      name: category?.name,
      position: category?.position,
      item: new URL(`/${category?.name}`, url).href,
    };
  }).filter(Boolean) as ListItem<string>[];

  return itemListElement;
};
