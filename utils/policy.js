/**
 * Evaluates ABAC policy against role and attribute
 * 
 * Supports:
 * - role:CityAuthority
 * - role:Researcher AND attribute:sensitivity=private
 * - role:CityAuthority OR role:Citizen AND attribute:sensitivity=public
 * 
 * FIXED: Proper AND/OR evaluation logic
 */
exports.evaluatePolicy = (policy, role, attribute) => {
  if (!policy) return false;

  // Split by OR (case-insensitive)
  const orClauses = policy.split(/\s+OR\s+/i).map(c => c.trim());

  // Check each OR clause
  for (const clause of orClauses) {
    // Split by AND (case-insensitive)
    const andParts = clause.split(/\s+AND\s+/i).map(p => p.trim());

    let allConditionsMet = true;

    // All AND conditions must be satisfied
    for (const part of andParts) {
      if (part.startsWith("role:")) {
        const requiredRole = part.replace("role:", "").trim();
        if (role !== requiredRole) {
          allConditionsMet = false;
          break;
        }
      } else if (part.startsWith("attribute:")) {
        const requiredAttr = part.replace("attribute:", "").trim();
        if (attribute !== requiredAttr) {
          allConditionsMet = false;
          break;
        }
      }
    }

    // If all AND conditions in this OR clause are met, grant access
    if (allConditionsMet) {
      return true;
    }
  }

  return false;
};
