import { Head } from "$fresh/runtime.ts";
import { Section } from "deco/blocks/section.ts";
import { ComponentMetadata } from "deco/engine/block.ts";
import { Context } from "deco/live.ts";
import {
  usePageContext as useDecoPageContext,
  useRouterContext,
} from "deco/runtime/fresh/routes/entrypoint.tsx";
import { JSX } from "preact";
import Events from "../components/Events.tsx";
import LiveControls from "../components/_Controls.tsx";
import { AppContext } from "../mod.ts";
import type { Page } from "deco/blocks/page.tsx";
import { Component } from "preact";
import { ComponentFunc } from "deco/engine/block.ts";
import { HttpError } from "deco/engine/errors.ts";
import { logger } from "deco/observability/otel/config.ts";
import { isDeferred } from "deco/mod.ts";
import ErrorPageComponent from "../../utils/defaultErrorPage.tsx";
import { SEOSection } from "../components/Seo.tsx";
import Clickhouse, {
  generateSessionId,
  generateUserId,
  SESSION_COOKIE_NAME,
  UID_COOKIE_NAME,
} from "../components/Clickhouse.tsx";
import { getCookies, setCookie } from "std/http/cookie.ts";

const noIndexedDomains = ["decocdn.com", "deco.site", "deno.dev"];

/**
 * @title Sections
 * @label hidden
 * @changeable true
 */
export type Sections = Section[];

export interface DefaultPathProps {
  possiblePaths: string[];
}

/**
 * @titleBy name
 * @label rootHidden
 */
export interface Props {
  name: string;
  /**
   * @format unused-path
   */
  path?: string;
  /** @hide true */
  seo?: Section<SEOSection>;
  sections: Sections;
  /** @hide true */
  unindexedDomain?: boolean;
}

export function renderSection(section: Props["sections"][number]) {
  if (section === undefined || section === null) return <></>;
  const { Component, props } = section;

  return <Component {...props} />;
}

class ErrorBoundary // deno-lint-ignore no-explicit-any
  extends Component<{ fallback: ComponentFunc<any> }> {
  state = { error: null as Error | null };

  // deno-lint-ignore no-explicit-any
  static getDerivedStateFromError(error: any) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this?.state?.error;
      const msg = `rendering: ${this.props} ${err?.stack}`;
      logger.error(msg);
      console.error(msg);
    }
    return !this.state.error ||
        (this.state.error instanceof HttpError &&
          (this.state.error as HttpError).status < 400)
      ? this.props.children
      : this.props.fallback(this.state.error);
  }
}

const useDeco = () => {
  const metadata = useDecoPageContext()?.metadata;
  const routerCtx = useRouterContext();
  const pageId = pageIdFromMetadata(metadata);
  return {
    flags: routerCtx?.flags ?? [],
    page: {
      id: pageId,
      pathTemplate: routerCtx?.pagePath,
    },
  };
};

/**
 * @title Page
 */
function Page({
  sections,
  errorPage,
  devMode,
  seo,
  unindexedDomain,
  avoidRedirectingToEditor,
  sendToClickHouse,
  userId,
  sessionId,
}: Props & {
  errorPage?: Page;
  devMode: boolean;
  avoidRedirectingToEditor?: boolean;
  sendToClickHouse?: boolean;
  userId: string;
  sessionId: string;
}): JSX.Element {
  const context = Context.active();
  const site = { id: context.siteId, name: context.site };
  const deco = useDeco();

  return (
    <>
      {unindexedDomain && (
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      )}
      <ErrorBoundary
        fallback={(error) =>
          error instanceof HttpError &&
            errorPage !== undefined &&
            errorPage !== null &&
            !devMode
            ? <errorPage.Component {...errorPage.props}></errorPage.Component>
            : (
              <ErrorPageComponent
                error={(devMode && error instanceof (Error || HttpError)
                  ? error.stack
                  : "") || ""}
              />
            )}
      >
        {seo && renderSection(seo)}
        <LiveControls
          avoidRedirectingToEditor={avoidRedirectingToEditor}
          site={site}
          {...deco}
        />
        <Events deco={deco} />
        {sendToClickHouse && (
          <Clickhouse
            siteId={site.id}
            siteName={site.name}
            userId={userId}
            sessionId={sessionId}
          />
        )}
        {sections.map(renderSection)}
      </ErrorBoundary>
    </>
  );
}

export const loader = async (
  { sections, ...restProps }: Props,
  req: Request,
  ctx: AppContext,
) => {
  const url = new URL(req.url);
  const devMode = url.searchParams.has("__d");

  const unindexedDomain = noIndexedDomains.some((domain) =>
    url.origin.includes(domain)
  );

  const cookies = getCookies(req.headers);
  let userId = cookies[UID_COOKIE_NAME];
  let sessionId = cookies[SESSION_COOKIE_NAME];

  const day = 1000 * 60 * 60 * 24;

  if (!userId) {
    userId = generateUserId();
    setCookie(ctx.response.headers, {
      value: userId,
      name: UID_COOKIE_NAME,
      path: "/",
      secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + day * 365), // 1 year
    });
  }

  if (!sessionId) {
    sessionId = generateSessionId();
    setCookie(ctx.response.headers, {
      value: sessionId,
      name: SESSION_COOKIE_NAME,
      path: "/",
      secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + day * 7), // seven days
    });
  }

  return {
    ...restProps,
    sections,
    errorPage: isDeferred<Page>(ctx.errorPage)
      ? await ctx.errorPage()
      : undefined,
    devMode,
    unindexedDomain,
    avoidRedirectingToEditor: ctx.avoidRedirectingToEditor,
    sendToClickHouse: ctx.sendToClickHouse,
    userId,
    sessionId,
  };
};

export function Preview(props: Props) {
  const { sections, seo } = props;
  const deco = useDeco();

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {seo && renderSection(seo)}
      <Events deco={deco} />
      {sections.map(renderSection)}
    </>
  );
}

const PAGE_NOT_FOUND = -1;
export const pageIdFromMetadata = (metadata: ComponentMetadata | undefined) => {
  if (!metadata) {
    return PAGE_NOT_FOUND;
  }

  const { resolveChain, component } = metadata;
  const pageResolverIndex = resolveChain.findLastIndex(
    (chain) => chain.type === "resolver" && chain.value === component,
  ) || PAGE_NOT_FOUND;

  const pageParent = pageResolverIndex > 0
    ? resolveChain[pageResolverIndex - 1]
    : null;

  return pageParent?.value ?? PAGE_NOT_FOUND;
};

export default Page;
