import { renderToString } from "react-dom/server";
import { headerTree } from "./header-tree";
process.stdout.write(renderToString(headerTree()));
