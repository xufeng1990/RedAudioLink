import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  onBack: () => void;
}

export default function TermsOfUseScreen({ onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Terms of Use</Text>

          <Text style={styles.sectionSubtitle}>Integrated Cybersecurity and Privacy Policy</Text>

          <Text style={styles.sectionHeading}>Introduction and Regulatory Reference</Text>
          <Text style={styles.body}>
            LAST Technology Srl recognizes the critical importance of cybersecurity and personal data protection as foundational pillars for maintaining the trust of customers, employees, and stakeholders. This policy outlines Management's commitment to implementing an integrated Cybersecurity and Privacy framework that safeguards IT systems, corporate information, and personal data in compliance with EU Directive 2022/2555 ("NIS2"), the GDPR (EU Regulation 2016/679), Legislative Decree 138/2024, and other applicable legal requirements.
          </Text>

          <Text style={styles.sectionHeading}>Objectives</Text>
          <Text style={styles.body}>
            The adoption of an integrated cybersecurity and privacy framework aims to:
          </Text>
          <Text style={styles.bulletItem}>• Protect company information and personal data from unauthorized access, alteration, disclosure, or destruction;</Text>
          <Text style={styles.bulletItem}>• Ensure the confidentiality, integrity, and availability of data and IT systems;</Text>
          <Text style={styles.bulletItem}>• Maintain business continuity by minimizing risks related to cybersecurity and personal data protection;</Text>
          <Text style={styles.bulletItem}>• Achieve full compliance with current cybersecurity and data protection regulations;</Text>
          <Text style={styles.bulletItem}>• Enhance awareness and responsibility among all employees regarding information security and privacy protection;</Text>
          <Text style={styles.bulletItem}>• Actively contribute to strengthening cybersecurity and privacy at both national and EU levels, thereby protecting society and the market.</Text>

          <Text style={styles.sectionHeading}>Scope</Text>
          <Text style={styles.body}>
            This policy applies to all employees, collaborators, suppliers, and third parties who access LAST Technology's IT systems and personal data, regardless of their location or the nature of their contractual relationship.
          </Text>

          <Text style={styles.sectionHeading}>Cybersecurity and Privacy Principles</Text>
          <Text style={styles.body}>
            LAST Technology is committed to implementing appropriate and proportionate technical, organizational, and procedural measures to:
          </Text>
          <Text style={styles.bulletItem}>• Manage risks associated with the security of IT systems and networks involved in its operations and service delivery;</Text>
          <Text style={styles.bulletItem}>• Protect personal data in accordance with the GDPR principles of lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, integrity, and confidentiality;</Text>
          <Text style={styles.bulletItem}>• Implement data protection by design and by default in the development of new products, services, and processes;</Text>
          <Text style={styles.bulletItem}>• Ensure timely detection, reporting, and management of cybersecurity incidents and personal data breaches;</Text>
          <Text style={styles.bulletItem}>• Promote a culture of security awareness and privacy protection through regular training and communication programs.</Text>

          <Text style={styles.sectionHeading}>Acceptable Use</Text>
          <Text style={styles.body}>
            Users of this application agree to use the service solely for legitimate business purposes related to smoke alarm and fire safety inspections. Any misuse, unauthorized access, or attempt to compromise system security is strictly prohibited and may result in immediate termination of access.
          </Text>

          <Text style={styles.sectionHeading}>Inspection Records</Text>
          <Text style={styles.body}>
            All inspection records, photographs, and reports generated through this application are the property of the respective business entity. Users are responsible for ensuring the accuracy and completeness of all data entered during inspections.
          </Text>

          <Text style={styles.sectionHeading}>Limitation of Liability</Text>
          <Text style={styles.body}>
            While we strive to maintain the highest standards of reliability, we do not guarantee uninterrupted service availability. Users should maintain backup records of critical inspection data. We shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use this service.
          </Text>

          <Text style={styles.sectionHeading}>Modifications</Text>
          <Text style={styles.body}>
            We reserve the right to modify these Terms of Use at any time. Users will be notified of any material changes via the application or registered email address. Continued use of the application after such modifications constitutes acceptance of the updated terms.
          </Text>

          <Text style={styles.sectionHeading}>Governing Law</Text>
          <Text style={styles.body}>
            These Terms of Use shall be governed by and construed in accordance with the laws of Australia. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of Australian courts.
          </Text>

          <Text style={styles.sectionHeading}>Contact</Text>
          <Text style={styles.body}>
            For any questions regarding these Terms of Use, please contact us at: support@echotag.com
          </Text>

          <Text style={styles.lastUpdated}>Last updated: April 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 22,
    color: '#999',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
});
