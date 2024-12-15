const countryNameToCode = {
    'France': 'FR',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Italy': 'IT',
    'Germany': 'DE',
    'Spain': 'ES'
};

// Mapping code pays → code langue
const countryToLanguageMap = {
    'FR': 'fr', // Français
    'US': 'en', // Anglais
    'GB': 'en', // Anglais
    'IT': 'it', // Italien
    'DE': 'de', // Allemand
    'ES': 'es'  // Espagnol
};

export function getLanguageCodeFromCountryName(countryName) {
    // Récupérer le code du pays à partir du nom complet
    const countryCode = countryNameToCode[countryName] || null;

    if (countryCode && countryToLanguageMap[countryCode]) {
        return countryToLanguageMap[countryCode];
    }

    // Par défaut, si non trouvé, retourner 'en' (anglais)
    return 'en';
}
