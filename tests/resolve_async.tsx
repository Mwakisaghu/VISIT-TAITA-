import React from "react";

/**
 * The page's tree with its "waiting" part filled in: every async component is run and every Suspense boundary replaced by what it was waiting for, which is what a visitor ends up looking at. Tests that check
 * the CONTENT of a list page use it, so they keep checking exactly the markup they always did; the "heading first, results later" behaviour has its own test (loading_states_test) using the real streaming renderer.
 */
export async function resolveAsync(node: any): Promise<any> {
  if (node == null || typeof node === "string" || typeof node === "number" || typeof node === "boolean") return node;
  if (Array.isArray(node)) return Promise.all(node.map(resolveAsync));
  if (!React.isValidElement(node)) return node;
  const el: any = node;
  if (el.type === React.Suspense) return resolveAsync(el.props.children);
  if (typeof el.type === "function" && el.type.constructor?.name === "AsyncFunction") return resolveAsync(await el.type(el.props));
  if (el.props && el.props.children !== undefined) { const kids = await resolveAsync(el.props.children); return React.cloneElement(el, undefined, ...(Array.isArray(kids) ? kids : [kids])); }
  return el;
}
