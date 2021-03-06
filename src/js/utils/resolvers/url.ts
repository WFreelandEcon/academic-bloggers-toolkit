// tslint:disable cyclomatic-complexity
// Disabling rule in this instance because `||` short-circuit evaluation is counted toward the
// complexity and that feature is instrumental to this function.
// Without it, the function would _more_ complex.

import { AutociteResponse } from 'utils/resolvers';

interface WebpageResponse {
    authors: Array<{
        firstname: string;
        lastname: string;
    }>;
    article: {
        /**
         * Facebook URL - not name
         */
        author?: string;
        /**
         * ISO Date String
         */
        modified_time?: string;
        /**
         * ISO Date String
         */
        published_time?: string;
        /**
         * Facebook URL
         */
        publisher?: string;
        /**
         * Category or section of source
         */
        section?: string;
        /**
         * CSV list of tags
         */
        tag?: string;
    };
    /**
     * Published Date ISO string
     */
    issued?: string;
    og: {
        /**
         * Article description
         */
        description?: string;
        /**
         * Height of main image in px
         */
        image_height?: string;
        /**
         * Width of main image in px
         */
        image_width?: string;
        /**
         * urlencoded image url
         */
        image?: string;
        /**
         * Site locale
         */
        locale?: string;
        /**
         * ISO Date String
         */
        pubdate?: string;
        /**
         * Clean URL form of site (e.g. `social.techcrunch.com`)
         */
        site?: string;
        /**
         * Title of website
         */
        site_name?: string;
        /**
         * Title of Article
         */
        title?: string;
        /**
         * Type of posting (generally article)
         */
        type?: string; // tslint:disable-line
        /**
         * ISO Date String
         */
        updated_time?: string;
        /**
         * URL of page
         */
        url?: string;
    };
    sailthru: {
        /**
         * _usually_ is `firstname lastname`
         */
        author?: string;
        /**
         * ISO Date String (issued)
         */
        date?: string;
        /**
         * Article description
         */
        description?: string;
        /**
         * Full-size image URL
         */
        image_full?: string;
        /**
         * Thumbnail image URL
         */
        image_thumb?: string;
        /**
         * CSV list of tags
         */
        tags?: string;
        /**
         * Title of Article
         */
        title?: string;
    };
    /**
     * Title of Article - last resort
     */
    title?: string;
    /**
     * URL of page
     */
    url?: string;
}

/**
 * Communicates with AJAX to the WordPress server to retrieve metadata for a given web URL.
 * @param url - The URL of interest
 * @return URL Meta returned from the server
 */
export async function getFromURL(url: string): Promise<AutociteResponse> {
    const headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
    });
    // FIXME: This is a bug in typescript. URLSearchParams are currently
    // not accepted in the typescript definitions for `fetch` even though
    // they should be.
    const body: any = new URLSearchParams(
        `action=get_website_meta&site_url=${encodeURIComponent(url)}`,
    );
    const req = await fetch(top.ajaxurl, {
        method: 'POST',
        headers,
        body,
        credentials: 'same-origin',
    });

    if (!req.ok) {
        throw new Error(
            req.status === 501
                ? top.ABT.i18n.errors.missing_php_features
                : req.statusText,
        );
    }

    const res: WebpageResponse = await req.json();

    // prettier-ignore
    const title =
        res.og.title ||
        res.sailthru.title ||
        res.title ||
        '';

    // prettier-ignore
    const issued =
        res.issued ||
        res.og.pubdate ||
        res.article.published_time ||
        res.sailthru.date ||
        '';

    const people: ABT.Contributor[] = res.authors.map(person => ({
        given: person.firstname,
        family: person.lastname,
        type: <CSL.PersonFieldKey>'author',
    }));

    return {
        fields: {
            accessed: parseDateString(new Date().toISOString()),
            title,
            issued: parseDateString(issued),
            'container-title': res.og.site_name || '',
            URL: url,
        },
        people,
    };
}

/**
 * Parses a date into the format `YYYY/MM/DD`.
 * @param input raw input string from API response.
 */
function parseDateString(input: string): string {
    if (isNaN(Date.parse(input))) {
        return '';
    }
    const date = new Date(input);
    const [month, day, year] = date
        .toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC',
        })
        .split('/');
    return `${year}/${month}/${day}`;
}
