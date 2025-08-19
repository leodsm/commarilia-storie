<?php
/**
 * Plugin Name: ComMarília Stories
 * Description: Sistema de stories com player e gerenciamento via WordPress.
 * Version: 1.0.0
 * Author: OpenAI Assistant
 */

if (!defined('ABSPATH')) exit;

function commarilia_register_post_type() {
    $labels = [
        'name' => 'Stories',
        'singular_name' => 'Story',
        'add_new_item' => 'Adicionar Story',
        'edit_item' => 'Editar Story',
        'new_item' => 'Novo Story',
        'view_item' => 'Ver Story',
        'search_items' => 'Buscar Stories',
        'not_found' => 'Nenhum story encontrado',
        'not_found_in_trash' => 'Nenhum story encontrado na lixeira',
    ];
    $args = [
        'labels' => $labels,
        'public' => true,
        'supports' => ['title','editor','thumbnail'],
        'show_in_rest' => true,
    ];
    register_post_type('commarilia_story', $args);
}
add_action('init', 'commarilia_register_post_type');

function commarilia_add_meta_boxes() {
    add_meta_box('commarilia_story_meta','Detalhes do Story','commarilia_story_meta_box','commarilia_story','normal','high');
}
add_action('add_meta_boxes', 'commarilia_add_meta_boxes');

function commarilia_story_meta_box($post) {
    wp_nonce_field('commarilia_save_story','commarilia_story_nonce');
    $category = get_post_meta($post->ID,'category',true);
    $categorycolor = get_post_meta($post->ID,'categorycolor',true);
    $cardtitle = get_post_meta($post->ID,'cardtitle',true);
    $cardimage = get_post_meta($post->ID,'cardimage',true);
    $pages = get_post_meta($post->ID,'pages',true);
    $fullcontent = get_post_meta($post->ID,'fullcontent',true);
    echo '<p><label>Categoria</label><br><input type="text" name="commarilia_category" value="'.esc_attr($category).'" class="widefat"></p>';
    echo '<p><label>Cor da Categoria</label><br><input type="color" name="commarilia_categorycolor" value="'.esc_attr($categorycolor).'"></p>';
    echo '<p><label>Imagem do Card (URL)</label><br><input type="text" name="commarilia_cardimage" value="'.esc_attr($cardimage).'" class="widefat"></p>';
    echo '<p><label>Título do Card</label><br><input type="text" name="commarilia_cardtitle" value="'.esc_attr($cardtitle).'" class="widefat"></p>';
    echo '<p><label>Páginas (JSON)</label><br><textarea name="commarilia_pages" rows="6" class="widefat">'.esc_textarea($pages).'</textarea><small>Ex: [{"mediaUrl":"...","mediaType":"image","text":"...","showLink":true}]</small></p>';
    echo '<p><label>Conteúdo Completo (JSON)</label><br><textarea name="commarilia_fullcontent" rows="6" class="widefat">'.esc_textarea($fullcontent).'</textarea><small>Ex: {"title":"","image":"","body":""}</small></p>';
}

function commarilia_save_story_meta($post_id) {
    if (!isset($_POST['commarilia_story_nonce']) || !wp_verify_nonce($_POST['commarilia_story_nonce'],'commarilia_save_story')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post',$post_id)) return;
    update_post_meta($post_id,'category', sanitize_text_field($_POST['commarilia_category'] ?? ''));
    update_post_meta($post_id,'categorycolor', sanitize_hex_color($_POST['commarilia_categorycolor'] ?? ''));
    update_post_meta($post_id,'cardimage', esc_url_raw($_POST['commarilia_cardimage'] ?? ''));
    update_post_meta($post_id,'cardtitle', sanitize_text_field($_POST['commarilia_cardtitle'] ?? ''));
    $pages = wp_unslash($_POST['commarilia_pages'] ?? '');
    update_post_meta($post_id,'pages', $pages);
    $fullcontent = wp_unslash($_POST['commarilia_fullcontent'] ?? '');
    update_post_meta($post_id,'fullcontent', $fullcontent);
}
add_action('save_post_commarilia_story','commarilia_save_story_meta');

function commarilia_register_rest() {
    register_rest_route('commarilia/v1','/stories',[ 'methods' => 'GET', 'callback' => 'commarilia_rest_get_stories' ]);
}
add_action('rest_api_init','commarilia_register_rest');

function commarilia_rest_get_stories($request) {
    $posts = get_posts([
        'post_type' => 'commarilia_story',
        'post_status' => 'publish',
        'numberposts' => -1,
        'orderby' => 'date',
        'order' => 'DESC',
    ]);
    $data = [];
    foreach ($posts as $post) {
        $pages = json_decode(get_post_meta($post->ID,'pages',true), true);
        $fullcontent = json_decode(get_post_meta($post->ID,'fullcontent',true), true);
        $data[] = [
            'id' => $post->ID,
            'category' => get_post_meta($post->ID,'category',true),
            'categorycolor' => get_post_meta($post->ID,'categorycolor',true),
            'cardtitle' => get_post_meta($post->ID,'cardtitle',true) ?: get_the_title($post),
            'cardimage' => get_post_meta($post->ID,'cardimage',true),
            'timestamp' => get_post_time('c', false, $post),
            'pages' => $pages ?: [],
            'fullcontent' => $fullcontent ?: [],
        ];
    }
    return rest_ensure_response($data);
}

function commarilia_stories_shortcode() {
    wp_enqueue_style('commarilia-fonts','https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap',[],null);
    wp_enqueue_script('tailwindcss','https://cdn.tailwindcss.com',[],null,true);
    wp_enqueue_script('feather-icons','https://unpkg.com/feather-icons',[],null,true);
    wp_enqueue_style('commarilia-storie', plugin_dir_url(__FILE__).'assets/css/commarilia-storie.css',[], '1.0');
    wp_enqueue_script('commarilia-storie', plugin_dir_url(__FILE__).'assets/js/commarilia-storie.js',[ 'feather-icons' ],'1.0',true);
    wp_localize_script('commarilia-storie','commariliaStories',[ 'restUrl' => rest_url('commarilia/v1/stories') ]);
    ob_start();
    include plugin_dir_path(__FILE__).'templates/frontend.php';
    return ob_get_clean();
}
add_shortcode('commarilia_stories','commarilia_stories_shortcode');

function commarilia_insert_demo_posts() {
    $file = plugin_dir_path(__FILE__).'assets/data/demo-posts.json';
    if (!file_exists($file)) return;
    $json = file_get_contents($file);
    $posts = json_decode($json,true);
    if (!$posts) return;
    foreach ($posts as $p) {
        $existing = get_page_by_title($p['cardTitle'] ?? $p['cardtitle'], OBJECT, 'commarilia_story');
        if ($existing) continue;
        $post_id = wp_insert_post([
            'post_title' => wp_strip_all_tags($p['cardTitle'] ?? $p['cardtitle']),
            'post_type' => 'commarilia_story',
            'post_status' => 'publish',
            'post_date' => date('Y-m-d H:i:s', strtotime($p['timestamp'] ?? 'now')),
        ]);
        if (!$post_id) continue;
        update_post_meta($post_id,'category', $p['category'] ?? '');
        update_post_meta($post_id,'categorycolor', $p['categoryColor'] ?? $p['categorycolor'] ?? '');
        update_post_meta($post_id,'cardimage', $p['cardImage'] ?? $p['cardimage'] ?? '');
        update_post_meta($post_id,'cardtitle', $p['cardTitle'] ?? $p['cardtitle'] ?? '');
        update_post_meta($post_id,'pages', wp_json_encode($p['pages'] ?? []));
        update_post_meta($post_id,'fullcontent', wp_json_encode($p['fullContent'] ?? $p['fullcontent'] ?? []));
    }
}

function commarilia_activate() {
    commarilia_register_post_type();
    commarilia_insert_demo_posts();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'commarilia_activate');

function commarilia_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'commarilia_deactivate');

