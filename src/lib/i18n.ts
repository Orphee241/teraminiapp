export type AppLanguage = 'fr' | 'en'

const translations: Record<string, string> = {
  'Accueil': 'Home', 'Services': 'Services', 'Profil': 'Profile', 'Mon compte': 'My account', 'Votre espace': 'Your space', 'Bienvenue': 'Welcome', 'Gérez vos services depuis un seul espace.': 'Manage your services from one space.',
  'NOS SOLUTIONS': 'OUR SOLUTIONS', 'Découvrez tous les services de Terainterface.': 'Discover all Terainterface services.',
  'ESPACE CLIENT': 'CLIENT AREA', 'ESPACE PERSONNEL': 'PERSONAL AREA', 'ASSISTANTE TERAINTERFACE': 'TERAINTERFACE ASSISTANT',
  'Des documents professionnels': 'Professional documents', 'Créez vos devis et factures en quelques secondes.': 'Create your quotes and invoices in seconds.',
  'Michelle': 'Michelle', 'Discuter directement avec notre assistante.': 'Chat directly with our assistant.',
  'Développement web ou mobile': 'Web or mobile development', 'Sites web, applications mobiles et solutions métier.': 'Websites, mobile apps and business solutions.',
  'Design graphique': 'Graphic design', 'Identité visuelle, supports de communication et créations graphiques.': 'Visual identity, communication materials and graphic creations.',
  'Montage vidéo': 'Video editing', 'Montage, habillage et finition de vos contenus vidéo.': 'Editing, motion design and finishing for your video content.',
  'Community Management': 'Community Management', 'Animation, publication et suivi de vos réseaux sociaux.': 'Social media management, publishing and monitoring.',
  'Création digitale': 'Digital creation', 'Conception de contenus et expériences numériques.': 'Digital content and experience design.',
  'Couverture photo': 'Photography coverage', 'Reportage et couverture photographique de vos événements.': 'Event photography and coverage.',
  'Couverture vidéo': 'Video coverage', 'Captation vidéo de vos événements et activités.': 'Video recording and coverage of your events.',
  'E-commerce': 'E-commerce', 'Boutiques en ligne et solutions de vente digitale.': 'Online stores and digital sales solutions.',
  'Formations': 'Training', 'Accompagnement et formations adaptées à vos besoins.': 'Guidance and training adapted to your needs.',
  'Divertissement': 'Entertainment', 'Un espace de divertissement numérique à découvrir.': 'A digital entertainment space to discover.',
  'Créer un devis': 'Create a quote', 'Demander un devis professionnel personnalisé.': 'Request a personalized professional quote.',
  'Créer une facture': 'Create an invoice', 'Créer une facture professionnelle.': 'Create a professional invoice.',
  'Abonnements': 'Subscriptions', 'Paramètres': 'Settings', 'Assistance': 'Support', 'Administration': 'Administration',
  'Consulter vos informations personnelles.': 'View your personal information.', 'Gérer votre abonnement et vos offres.': 'Manage your subscription and offers.',
  'Gérer votre entreprise et vos préférences.': 'Manage your company and preferences.', 'Obtenir de l’aide sur un service ou une commande.': 'Get help with a service or order.',
  'Gérer les utilisateurs et les conversations.': 'Manage users and conversations.', 'PRÉFÉRENCES': 'PREFERENCES', 'Entreprise': 'Company',
  'Informations utilisées sur vos devis et factures.': 'Information used on your quotes and invoices.', 'Langue': 'Language', 'Choisissez la langue de l’application.': 'Choose the app language.',
  'Nom de l’entreprise (facultatif)': 'Company name (optional)', 'Téléphone': 'Phone', 'Adresse': 'Address', 'NIF (facultatif)': 'Tax ID (optional)', 'RCCM (facultatif)': 'Business registration (optional)',
  'Logo (facultatif)': 'Logo (optional)', 'Logo à importer prochainement': 'Logo upload coming soon', 'Enregistrer': 'Save', 'Informations enregistrées.': 'Information saved.',
  'Profil client': 'Client profile', 'Vos informations de compte sont liées à Telegram.': 'Your account information is linked to Telegram.',
  'MON OFFRE': 'MY PLAN', 'La gestion des abonnements sera bientôt disponible.': 'Subscription management will be available soon.',
  'AIDE': 'HELP', 'Contacter Michelle': 'Contact Michelle', 'Parler à notre assistante.': 'Chat with our assistant.',
  'Français': 'French', 'English': 'English', 'Retour': 'Back', 'Fermer': 'Close', 'Enregistrer les paramètres': 'Save settings',
  'Facture': 'Invoice', 'Mes factures': 'My invoices', 'Voir mes factures générées': 'View my generated invoices',
  'Archives': 'Archive', 'SERVICE': 'SERVICE', 'ARCHIVES': 'ARCHIVE', 'NOUVEAU DOCUMENT': 'NEW DOCUMENT',
  'Nom du client': 'Client name', 'Entreprise du client': 'Client company', 'Prestation ou article': 'Service or item', 'Quantité': 'Quantity', 'Prix unitaire (FCFA)': 'Unit price (XAF)',
  'Créer le devis': 'Create quote', 'Chargement de vos factures…': 'Loading your invoices…', 'Aucune facture générée.': 'No invoices generated.',
  'Tous les statuts': 'All statuses', 'Générées': 'Generated', 'Supprimées': 'Deleted', 'Rechercher...': 'Search...', 'Aperçu affiché directement dans l’application': 'Preview displayed directly in the app',
  'Écrire à Michelle…': 'Write to Michelle…', 'Michelle écrit…': 'Michelle is typing…', 'Retour aux services': 'Back to services',
  'Ouvrir l’App': 'Open the App', 'Telegram s’ouvrira pour lancer l’application.': 'Telegram will open to launch the app.',
  'Accède plus rapidement à nos services via notre Application': 'Access our services faster through our App',
}

export function translate(value: string, language: AppLanguage) {
  return language === 'en' ? translations[value] || value : Object.keys(translations).find(key => translations[key] === value) || value
}

export function installAutomaticTranslation(root: HTMLElement, language: AppLanguage) {
  const originals = new WeakMap<Node, string>()
  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text.trim()) return
      if (!originals.has(node)) originals.set(node, text)
      const original = originals.get(node) || text
      node.textContent = translate(original, language)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      ;['placeholder', 'aria-label', 'title'].forEach(attribute => {
        const value = element.getAttribute(attribute)
        if (value) {
          const key = `data-i18n-${attribute}`
          if (!element.hasAttribute(key)) element.setAttribute(key, value)
          element.setAttribute(attribute, translate(element.getAttribute(key) || value, language))
        }
      })
      node.childNodes.forEach(translateNode)
    }
  }
  const apply = () => root.childNodes.forEach(translateNode)
  apply()
  const observer = new MutationObserver(() => apply())
  observer.observe(root, { childList: true, subtree: true, characterData: true })
  return () => observer.disconnect()
}
