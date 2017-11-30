## CSS to xPath

Converts CSS selectors to equivalent XPath (see test.js for example usage).


### Unsupported selectors

These may be supported at a later date:

* `nth-last-child`
* `:lang()`

As far as I'm aware the following cannot be implemented in XPath:

* `*-of-type`

The following are excluded as they can only be partially supported:

* `:checked`
* `:disabled`
* `:enabled`
* `:required`
