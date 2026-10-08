# Ranking version 0.1

Pure scorer: editorial 20%, context fit 25%, verification 15%, completeness 10%, freshness 10%, normalized review quality 10%, popularity 5%, engagement 5%, minus risk plus capped manual adjustment. Inputs are capped at 0–100; manual adjustment is capped at ±20. Version and factor contributions are returned.

Paid claim, subscription, sponsorship and spend are not inputs. A unit test verifies additional commercial fields do not change the result. The initial UI sorts by name, reviewed rating or Last Verified. It does not assign ranking positions or recommendations to unscored fixtures. Production scoring inputs, audited overrides, decay jobs, contextual factors and snapshot storage are pending Stage 2.
