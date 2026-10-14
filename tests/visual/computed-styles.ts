/**
 * Runs in the page (pass it to page.evaluate): it must not use anything from
 * outside its own body.
 */
/**
 * Every element's computed style. Every letter and digit on the page is
 * first replaced with "x", so sizes resolved from text don't move with the
 * random booking refs. Lines are keyed by the element's path of tags and
 * classes (no positions) and sorted, because records with the same
 * timestamp come back in any order.
 */
export function computedStyles(): string {
	const texts = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	while (texts.nextNode()) texts.currentNode.nodeValue = texts.currentNode.nodeValue!.replace(/[\p{L}\p{N}]/gu, 'x');
	const lines: string[] = [];
	const walk = (el: Element, path: string) => {
		for (const pseudo of [null, '::before', '::after'] as const) {
			const style = getComputedStyle(el, pseudo);
			if (pseudo && (style.content === 'none' || style.content === 'normal')) continue;
			const props = Array.from(style)
				.filter((prop) => !prop.startsWith('--'))
				.sort()
				.map((prop) => `${prop}:${style.getPropertyValue(prop)}`)
				.join(';');
			lines.push(`${path}${pseudo ?? ''} {${props}}`);
		}
		for (const child of Array.from(el.children)) {
			const classes = typeof child.className === 'string' && child.className.trim() ? '.' + child.className.trim().split(/\s+/).sort().join('.') : '';
			walk(child, `${path} > ${child.tagName.toLowerCase()}${classes}`);
		}
	};
	// <head> renders nothing: skip it, so e.g. a new inline <style> isn't a difference.
	walk(document.body, 'html > body');
	return lines.sort().join('\n');
}
