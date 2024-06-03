// DO NOT EDIT. This file is generated by deco.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $$$$$$$$$0 from "./actions/cart/addCoupon.ts";
import * as $$$$$$$$$1 from "./actions/cart/addItem.ts";
import * as $$$$$$$$$2 from "./actions/cart/removeCoupon.ts";
import * as $$$$$$$$$3 from "./actions/cart/removeItem.ts";
import * as $$$$$$$$$4 from "./actions/cart/setSimulation.ts";
import * as $$$$$$$$$5 from "./actions/cart/simulation.ts";
import * as $$$$$$$$$6 from "./actions/cart/updateItem.ts";
import * as $$$$$$$$$7 from "./actions/newsletter/subscribe.ts";
import * as $0 from "./functions/requestToPathname.ts";
import * as $$$$0 from "./handlers/sitemap.ts";
import * as $$$0 from "./loaders/cart.ts";
import * as $$$1 from "./loaders/product/detailsPage.ts";
import * as $$$2 from "./loaders/product/getId.ts";
import * as $$$3 from "./loaders/product/list.ts";
import * as $$$4 from "./loaders/product/listingPage.ts";
import * as $$$5 from "./loaders/proxy.ts";
import * as $$$6 from "./loaders/user.ts";

const manifest = {
  "functions": {
    "magento/functions/requestToPathname.ts": $0,
  },
  "loaders": {
    "magento/loaders/cart.ts": $$$0,
    "magento/loaders/product/detailsPage.ts": $$$1,
    "magento/loaders/product/getId.ts": $$$2,
    "magento/loaders/product/list.ts": $$$3,
    "magento/loaders/product/listingPage.ts": $$$4,
    "magento/loaders/proxy.ts": $$$5,
    "magento/loaders/user.ts": $$$6,
  },
  "handlers": {
    "magento/handlers/sitemap.ts": $$$$0,
  },
  "actions": {
    "magento/actions/cart/addCoupon.ts": $$$$$$$$$0,
    "magento/actions/cart/addItem.ts": $$$$$$$$$1,
    "magento/actions/cart/removeCoupon.ts": $$$$$$$$$2,
    "magento/actions/cart/removeItem.ts": $$$$$$$$$3,
    "magento/actions/cart/setSimulation.ts": $$$$$$$$$4,
    "magento/actions/cart/simulation.ts": $$$$$$$$$5,
    "magento/actions/cart/updateItem.ts": $$$$$$$$$6,
    "magento/actions/newsletter/subscribe.ts": $$$$$$$$$7,
  },
  "name": "magento",
  "baseUrl": import.meta.url,
};

export type Manifest = typeof manifest;

export default manifest;
