package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "workspaces")
@Getter @Setter @NoArgsConstructor
public class Workspace {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** AD grup adı — workspace ile bire bir eşlenir (örn. "QA-Team"). */
    @Column(unique = true, nullable = false)
    private String ldapGroup;

    @Column(nullable = false)
    private String name;

    @Column(updatable = false, nullable = false)
    private Instant createdAt = Instant.now();

    public Workspace(String ldapGroup, String name) {
        this.ldapGroup = ldapGroup;
        this.name = name;
    }
}
