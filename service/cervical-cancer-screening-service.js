const db = require('../etl-db');

const defs = {
  getPatientLatestCericalScreeningResult,
  getPatientCervicalCancerScreeningSummary
};

function getPatientLatestCericalScreeningResult(personId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT fli.person_id,
    test_datetime,
    via_or_via_vili,
    TIMESTAMPDIFF(YEAR, test_datetime, NOW()) AS 'years_since_last_via_or_via_vili_test',
    CASE
        WHEN TIMESTAMPDIFF(YEAR, test_datetime, NOW()) >= 1 THEN 1
        ELSE NULL
    END AS 'qualifies_for_via_or_via_vili_retest',
    CASE
        WHEN value_coded = 5276 THEN 1
        ELSE NULL
    END AS 'has_hysterectomy_done'
FROM etl.flat_labs_and_imaging fli
LEFT JOIN
(SELECT person_id,
       value_coded,
       max(obs_datetime) latest_steralization_dt
FROM amrs.obs
WHERE value_coded = 5276
  AND person_id = ${personId}
  AND voided = 0
LIMIT 1) fs ON (fli.person_id = fs.person_id)
WHERE via_or_via_vili IS NOT NULL
AND fli.person_id = ${personId}
ORDER BY test_datetime DESC
LIMIT 1;`;
    const queryParts = {
      sql: sql
    };
    db.queryServer(queryParts, function (result) {
      result.sql = sql;
      resolve(result);
    });
  });
}

function getPatientCervicalCancerScreeningSummary(patientUuId) {
  return new Promise((resolve, reject) => {
    if (patientUuId === '' || patientUuId === null) {
      reject('Patient Uuid is missing');
    } else {
      const sql = `SELECT 
          person_id,
              DATE_FORMAT(test_datetime, '%d-%m-%Y') AS 'test_date',
              via_or_via_vili,
              pap_smear,
              hpv,
              uuid,
              CASE
                  WHEN via_or_via_vili IS NOT NULL THEN 'VIA or VIA/VILI'
                  WHEN pap_smear IS NOT NULL THEN 'PAP SMEAR'
                  WHEN hpv IS NOT NULL THEN 'HPV'
                  ELSE NULL
              END AS 'test',
              CASE
                  WHEN via_or_via_vili = 7469 THEN 'ACETOWHITE LESION'
                  WHEN via_or_via_vili = 1115 THEN 'NORMAL'
                  WHEN via_or_via_vili = 6497 THEN 'DYSFUNCTIONAL UTERINE BLEEDING'
                  WHEN via_or_via_vili = 703 THEN 'POSITIVE'
                  WHEN via_or_via_vili = 7470 THEN 'PUNCTUATED CAPILLARIES'
                  WHEN via_or_via_vili = 664 THEN 'NEGATIVE'
                  WHEN via_or_via_vili = 7472 THEN 'ATYPICAL BLOOD VESSELS'
                  WHEN via_or_via_vili = 7293 THEN 'ULCER'
                  WHEN via_or_via_vili = 9593 THEN 'FRIABLE TISSUE'
                  WHEN via_or_via_vili = 6971 THEN 'POSSIBLE'
                  ELSE NULL
              END AS 'via_test_result'
      FROM
          etl.flat_labs_and_imaging
      WHERE
          (via_or_via_vili IS NOT NULL
              OR pap_smear IS NOT NULL
              OR hpv IS NOT NULL)
              AND uuid = '${patientUuId}'
      ORDER BY test_datetime DESC
      LIMIT 10;`;

      const queryParts = {
        sql: sql
      };
      db.queryServer(queryParts, function (result) {
        resolve(result);
      });
    }
  });
}

module.exports = defs;
