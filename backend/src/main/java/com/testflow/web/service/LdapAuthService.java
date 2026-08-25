package com.testflow.web.service;

import org.springframework.ldap.core.AttributesMapper;
import org.springframework.ldap.core.LdapTemplate;
import org.springframework.ldap.query.LdapQueryBuilder;
import org.springframework.ldap.support.LdapNameBuilder;
import org.springframework.stereotype.Service;

import javax.naming.Name;
import javax.naming.directory.Attributes;
import java.util.List;

/**
 * LDAP kimlik doğrulama + grup sorgulama.
 * Mock embedded LDAP'a karşı çalışır; gerçek AD'ye geçişte spring.ldap.* ayarları
 * ve gerekirse arama filtreleri (sAMAccountName, memberOf) güncellenir.
 */
@Service
public class LdapAuthService {

    private final LdapTemplate ldapTemplate;

    public LdapAuthService(LdapTemplate ldapTemplate) {
        this.ldapTemplate = ldapTemplate;
    }

    /**
     * Kullanıcı adı + şifre doğrulama. Başarısızsa exception fırlatır.
     * TODO(gerçek-AD): AD'de kullanıcı DN'i "uid" yerine genelde
     * "CN=Ad Soyad,OU=Users,..." formatındadır; bind için önce
     * sAMAccountName ile arama yapıp dönen DN ile bind edilmelidir
     * (veya userPrincipalName "ad.soyad@sirket.local" ile doğrudan bind).
     */
    public LdapUser authenticate(String username, String password) {
        Name userDn = LdapNameBuilder.newInstance()
                .add("ou", "users")
                .add("uid", username)
                .build();

        // Bind denemesi — şifre yanlışsa AuthenticationException fırlar
        // TODO(gerçek-AD): base DN'i application.properties'ten okuyun.
        ldapTemplate.getContextSource().getContext(
                userDn.toString() + ",dc=testflow,dc=com", password);

        // Kullanıcı bilgilerini çek
        List<LdapUser> users = ldapTemplate.search(
                LdapQueryBuilder.query().base("ou=users").where("uid").is(username),
                (AttributesMapper<LdapUser>) attrs -> new LdapUser(
                        username,
                        getAttr(attrs, "cn"),
                        getAttr(attrs, "mail")));

        if (users.isEmpty()) {
            throw new IllegalStateException("LDAP kullanıcısı bulunamadı: " + username);
        }
        return users.get(0);
    }

    /**
     * Kullanıcının üyesi olduğu ilk grubu döner (workspace eşlemesi için).
     * TODO(gerçek-AD): AD'de grup üyeliği kullanıcı nesnesindeki "memberOf"
     * attribute'undan okunur; TestFlow gruplarını ayırt etmek için grup adı
     * öneki (örn. "TF-") veya ayrı bir OU filtresi kullanın.
     */
    public String findUserGroup(String username) {
        String userDn = "uid=" + username + ",ou=users,dc=testflow,dc=com";
        List<String> groups = ldapTemplate.search(
                LdapQueryBuilder.query().base("ou=groups").where("member").is(userDn),
                (AttributesMapper<String>) attrs -> getAttr(attrs, "cn"));
        return groups.isEmpty() ? null : groups.get(0);
    }

    private String getAttr(Attributes attrs, String name) {
        try {
            var attr = attrs.get(name);
            return attr != null ? attr.get().toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public record LdapUser(String username, String displayName, String email) {}
}
