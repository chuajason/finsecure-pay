#!/usr/bin/env bash
# Task 5 evidence: introduce a dependency with a CRITICAL CVE (Log4Shell, CVE-2021-44228),
# push, watch the Security Checks gate block the release, then remediate.
# Usage: scripts/demo-security-finding.sh break | fix
set -euo pipefail
case "${1:-}" in
  break)
    python3 - <<'PY'
import re
p=open('pom.xml').read()
dep='''    <!-- DEMO ONLY: vulnerable version, CVE-2021-44228 (CRITICAL). The security gate must block this. -->
    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-core</artifactId>
      <version>2.14.1</version>
    </dependency>
'''
p=p.replace('  </dependencies>', dep+'  </dependencies>',1)
open('pom.xml','w').write(p)
PY
    git add pom.xml; git commit -m "demo: add log4j-core 2.14.1 (expect security gate to block)"; git push
    ;;
  fix)
    python3 - <<'PY'
import re
p=open('pom.xml').read()
p=re.sub(r'    <!-- DEMO ONLY.*?</dependency>\n','',p,flags=re.S)
open('pom.xml','w').write(p)
PY
    git add pom.xml; git commit -m "fix: remove vulnerable log4j-core dependency (remediation)"; git push
    ;;
  *) echo "usage: $0 break|fix"; exit 2;;
esac
