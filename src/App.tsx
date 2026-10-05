/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    window.location.replace("/team.html");
  }, []);

  return null;
}
