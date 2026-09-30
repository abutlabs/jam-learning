# jam-learning

**Read it online: https://abutlabs.github.io/jam-learning/**

Free material from abutlabs for JAM client teams and service builders, grounded in
running code:

- **[Build JAM together](https://abutlabs.github.io/jam-learning/together/)**: run
  [jamswap](https://github.com/abutlabs/jamswap), an order-book exchange that runs as a JAM
  service, on test nets of any mix of clients (all lasair, all PolkaJam, and both on one
  chain today), read its verdict, check your own node in one command and add it to a net,
  or build your own service for GP 0.8.0 and deploy it beside jamswap.
- **[Learning Observability](https://abutlabs.github.io/jam-learning/observability/)**:
  run the [abutlabs observability stack](https://github.com/abutlabs/observability), start
  a network yourself, and learn to read it: chain health, time to finality, work-package
  stages, logs, soak tests, and a real failure traced from its symptom to its cause. Every
  lab runs on the data you generate.
- **[Learning Lasair](https://abutlabs.github.io/jam-learning/lasair/)**: how a JAM client
  is built, with lasair, an OCaml client that passes every published Graypaper 0.8.0
  conformance vector, as the executable reference, plus M1 Understanding, chapter by
  chapter of the Graypaper with self-tests. Most lessons show lasair's code, and they say
  so: JAM Prize implementers should read the course's note on the Prize rules first.

The standards: the [Graypaper](https://graypaper.com) and the
[JAM Implementer Proposals](https://github.com/polkadot-fellows/JIPs).

## Layout

```
site/index.html               the front page: the three sections
site/together/                Build JAM together: jamswap on mixed-client nets, bring your client or service
site/assets/                  the one reader both courses share (css, js, icons, the OCaml toplevel)
site/lasair/                  Learning Lasair: pages, data/course.json, content/<track>/<lesson>.md
site/observability/           Learning Observability: pages, data/course.json, content/...
exercises/lasair/             standalone dune projects for the lasair course
browser/                      the source of the in-browser OCaml toplevel (site/assets/js/toplevel.js)
tools/check.py                the checks a change must pass (links, lesson lists, public-site rules)
tools/build.sh                check, copy, stamp: what the Pages workflow runs
tools/lasair/                 builders of the lasair section's data (M1 Understanding, the explorers)
```

A lesson is plain markdown in `site/<section>/content/<track>/<lesson>.md`, listed in that
section's `data/course.json`. The reader renders it in the browser; there is no build step
beyond copying and stamping asset hashes.

## Preview locally

```sh
tools/build.sh /tmp/preview/jam-learning
(cd /tmp/preview && python3 -m http.server 8000 --bind 127.0.0.1)
open http://127.0.0.1:8000/jam-learning/
```

While editing, `python3 -m http.server` in `site/` works too.

## Rules for content

`tools/check.py` fails the build (and so the deploy) on anything a public reader could not
follow: links into a private repository, the old Netlify site, local machine paths, or the
run ids of our own networks. A lab shows readers how to generate their own data; examples
use a placeholder such as `<your run id>` or an obviously made-up net (`mynet-...`).

## Who wrote it

The courses are written by Aiden, an AI (built on Anthropic's Claude), working with Aodh,
who directs the work and checks it. Claims are held to what can be verified: lasair against
the official conformance vectors and fuzzer, the labs by running them, the protocol against
the Graypaper and the JIPs. Corrections are welcome as issues.

## License

MIT, see [LICENSE](LICENSE).
